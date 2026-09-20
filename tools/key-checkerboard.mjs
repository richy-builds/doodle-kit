// Turns a stock "cutout" that has a baked-in transparency checkerboard (white /
// light-grey squares) into a real alpha PNG, by flood-filling background-coloured
// pixels from the image border and feathering the edge.
//   node tools/key-checkerboard.mjs in.jpg scenes/<name>/photo.png
// Needs ffmpeg + ffprobe on PATH (raw RGB in, raw RGBA out).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [src, dst] = process.argv.slice(2);
if (!src || !dst) { console.error('usage: node tools/key-checkerboard.mjs in.jpg out.png'); process.exit(1); }
const [W, H] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src])
  .toString().trim().split(',').map(Number);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'key-')), rgb = path.join(tmp, 'in.rgb'), rgba = path.join(tmp, 'out.rgba');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', rgb]);

const N = W * H, b = fs.readFileSync(rgb);
const isBg = i => b[i*3] >= 222 && Math.abs(b[i*3] - b[i*3+1]) < 10 && Math.abs(b[i*3+1] - b[i*3+2]) < 10;
const fill = new Uint8Array(N), q = new Int32Array(N);
let qh = 0, qt = 0;
const push = i => { if (!fill[i] && isBg(i)) { fill[i] = 1; q[qt++] = i; } };
for (let x = 0; x < W; x++) { push(x); push((H-1)*W + x); }
for (let y = 0; y < H; y++) { push(y*W); push(y*W + W-1); }
while (qh < qt) {
  const i = q[qh++], x = i % W, y = (i - x) / W;
  if (x > 0) push(i-1); if (x < W-1) push(i+1); if (y > 0) push(i-W); if (y < H-1) push(i+W);
}
const out = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const x = i % W, y = (i - x) / W;
  let a = 255;
  if (fill[i]) a = 0;
  else { // feather anti-aliased edge pixels next to the removed region
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x+dx, yy = y+dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && fill[yy*W + xx]) { near = true; break; }
    }
    if (near) { const l = (b[i*3] + b[i*3+1] + b[i*3+2]) / 3; a = Math.max(0, Math.min(255, Math.round((255 - l) * 255 / 70))); }
  }
  out[i*4] = b[i*3]; out[i*4+1] = b[i*3+1]; out[i*4+2] = b[i*3+2]; out[i*4+3] = a;
}
fs.writeFileSync(rgba, out);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', rgba, '-frames:v', '1', dst]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`keyed ${W}x${H} → ${dst}`);
