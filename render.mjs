// Renders the animation to out/doodle.mp4 deterministically:
// headless Chromium draws each frame via window.render(t), ffmpeg muxes H.264.
//   node render.mjs            → full 15 s @ 30 fps
//   node render.mjs --stills   → 4 sample PNGs in out/stills/ (quick look)
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const FPS = 30, DURATION = 15, N = FPS * DURATION;
const root = path.dirname(new URL(import.meta.url).pathname);
const stills = process.argv.includes('--stills');
const outDir = path.join(root, 'out', stills ? 'stills' : 'frames');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const shellDir = path.join(os.homedir(), 'Library/Caches/ms-playwright');
const shell = fs.readdirSync(shellDir).filter(d => d.startsWith('chromium_headless_shell-')).sort().pop();
const executablePath = path.join(shellDir, shell, 'chrome-headless-shell-mac-arm64/chrome-headless-shell');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
await page.goto('file://' + path.join(root, 'index.html') + '?capture');
await page.waitForFunction(() => window.ready, null, { timeout: 15000 });
await page.evaluate(() => document.fonts.ready);
const canvasEl = page.locator('#c');

const times = stills ? [1.2, 3.2, 5.5, 9.0, 14.0] : Array.from({ length: N }, (_, i) => i / FPS);
const t0 = Date.now();
for (let i = 0; i < times.length; i++) {
  await page.evaluate(t => render(t), times[i]);
  const name = stills ? `t${times[i].toFixed(1)}.png` : String(i).padStart(4, '0') + '.png';
  // element screenshot (not toDataURL): a file:// photo taints the canvas, and the
  // canvas is 1080 CSS px at DSF 1 so this is pixel-exact anyway
  await canvasEl.screenshot({ path: path.join(outDir, name), type: 'png', animations: 'disabled' });
  if (!stills && i % 50 === 0) process.stdout.write(`frame ${i}/${N}\r`);
}
await browser.close();
console.log(`\nrendered ${times.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${outDir}`);

if (!stills) {
  const mp4 = path.join(root, 'out', 'doodle.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(outDir, '%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  console.log('wrote', mp4);
}
