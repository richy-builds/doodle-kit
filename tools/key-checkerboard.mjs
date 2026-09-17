// Removes a baked-in transparency checkerboard (white / light-grey squares)
// by flood-filling "background-coloured" pixels from the image border.
// Usage: ffmpeg -i in.jpg -f rawvideo -pix_fmt rgb24 in.rgb
//        node tools/key-checkerboard.mjs in.rgb out.rgba 1300 1300
//        ffmpeg -f rawvideo -pix_fmt rgba -s 1300x1300 -i out.rgba -frames:v 1 photo.png
import fs from 'node:fs';
const [src, dst, w, h] = process.argv.slice(2);
const W = +w, H = +h, N = W * H;
const b = fs.readFileSync(src);
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
fs.writeFileSync(dst, out);
