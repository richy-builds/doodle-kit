// Renders a scene deterministically: headless Chromium draws each frame via
// window.render(t) on lib/page.html, ffmpeg muxes H.264.
//   node tools/render.mjs <scene>            → out/<scene>/<scene>.mp4 (30 fps)
//   node tools/render.mjs <scene> --stills   → 6 sample PNGs in out/<scene>/stills/
//   node tools/render.mjs <scene> --sheet    → the stills tiled into out/<scene>/sheet.png
//   node tools/render.mjs <scene> --motion   → 30 moments overlaid: out/<scene>/motion.png
//   node tools/render.mjs <scene> --t 5.2    → one PNG at that time: out/<scene>/t5.20.png
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { serve } from './serve.mjs';

const FPS = 30;
const args = process.argv.slice(2);
const name = args.find(a => !a.startsWith('--') && isNaN(+a)) || 'say-cheese';
const tArg = +args.find(a => !isNaN(+a) && a !== '');
const mode = args.includes('--stills') ? 'stills' : args.includes('--sheet') ? 'sheet' : args.includes('--motion') ? 'motion'
           : args.includes('--t') ? 'frame' : 'video';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
if (!fs.existsSync(path.join(root, 'scenes', name, 'scene.js'))) { console.error(`no scene: scenes/${name}/scene.js`); process.exit(1); }
if (mode === 'frame' && isNaN(tArg)) { console.error('--t needs a time in seconds, e.g. --t 5.2'); process.exit(1); }
const out = path.join(root, 'out', name);
fs.mkdirSync(out, { recursive: true });

// browser: $BROWSER_PATH → playwright's own chromium → any cached headless shell → installed Chrome
async function launch() {
  const tries = [];
  if (process.env.BROWSER_PATH) tries.push({ executablePath: process.env.BROWSER_PATH });
  const own = chromium.executablePath(); if (fs.existsSync(own)) tries.push({ executablePath: own });
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  if (fs.existsSync(cache)) for (const d of fs.readdirSync(cache).filter(d => d.startsWith('chromium_headless_shell-')).sort().reverse()) {
    const p = path.join(cache, d, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'); if (fs.existsSync(p)) tries.push({ executablePath: p });
  }
  tries.push({ channel: 'chrome' });
  let last;
  for (const o of tries) { try { return await chromium.launch({ headless: true, ...o }); } catch (e) { last = e; } }
  throw last;
}

const srv = await serve(root);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
let failed = false;
page.on('pageerror', e => { console.error('page error:', e.message); failed = true; });
page.on('console', m => { if (m.type() === 'error') { console.error('console:', m.text()); failed = true; } });
page.on('response', r => { if (r.status() >= 400) console.error('http', r.status(), r.url()); });
await page.goto(`${srv.url}/lib/page.html?scene=${name}&capture`);
await page.waitForFunction(() => window.ready, null, { timeout: 20000 });
const duration = await page.evaluate(() => window.duration);
if (failed || !duration) { console.error('scene did not mount'); await browser.close(); srv.close(); process.exit(1); }
const size = await page.evaluate(() => document.getElementById('c').width);
console.log(`${name}: ${duration}s, ${size}px, photo box`, await page.evaluate(() => JSON.stringify(window.photo.box)));
await page.setViewportSize({ width: size, height: size });

const renderAt = t => page.evaluate(t => window.render(t), t);
async function grab(file) {  // canvas → PNG (served over http so the canvas is not tainted)
  const url = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
  fs.writeFileSync(file, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
}
const fresh = dir => { fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); return dir; };
const ffmpeg = a => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' });
const t0 = Date.now();

if (mode === 'frame') {
  const f = path.join(out, `t${tArg.toFixed(2)}.png`);
  await renderAt(tArg); await grab(f); console.log('wrote', f);
}
if (mode === 'stills' || mode === 'sheet') {
  const dir = fresh(path.join(out, 'stills')), files = [];
  for (const u of [.06, .18, .32, .5, .7, .93]) {
    const t = Math.round(u * duration * FPS) / FPS, f = path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`);
    await renderAt(t); await grab(f); files.push(f);
  }
  console.log(`wrote ${files.length} stills → ${dir}`);
  if (mode === 'sheet') {
    const list = path.join(dir, 'list.txt');
    fs.writeFileSync(list, files.map(f => `file '${f}'`).join('\n'));
    const sheet = path.join(out, 'sheet.png');
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-vf', 'scale=540:-1,tile=3x2', '-frames:v', '1', sheet]);
    console.log('wrote', sheet);
  }
}
if (mode === 'motion') {
  const times = Array.from({ length: 30 }, (_, i) => i / 30 * duration), f = path.join(out, 'motion.png');
  await page.evaluate(ts => window.renderMotion(ts, .3), times);
  await grab(f); console.log('wrote', f);
}
if (mode === 'video') {
  const dir = fresh(path.join(out, 'frames')), N = Math.round(duration * FPS);
  for (let i = 0; i < N; i++) {
    await renderAt(i / FPS); await grab(path.join(dir, String(i).padStart(4, '0') + '.png'));
    if (i % 50 === 0) process.stdout.write(`frame ${i}/${N}\r`);
  }
  console.log(`\nrendered ${N} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const mp4 = path.join(out, `${name}.mp4`);
  ffmpeg(['-framerate', String(FPS), '-i', path.join(dir, '%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', mp4]);
  console.log('wrote', mp4);
}

await browser.close(); srv.close();
if (failed) process.exit(1);
