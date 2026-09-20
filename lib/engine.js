// lib/engine.js — a tiny hand-drawn doodle engine.
// Everything is a polyline: strokes are drawn twice with seeded jitter that is
// re-seeded 8×/s (the "boil"), revealed by prefix for the draw-on, and filled
// with offset translucent polygons so the colouring-in looks a little careless.
//
// One scene per page: mount(scene, canvas, base) wires a canvas, loads the photo,
// runs scene.build(k) and returns { render, renderMotion, duration }.

export const PI = Math.PI, TAU = PI * 2;
export const INK = '#2a2622';
export const C = { red: '#e2574c', blue: '#5b8fd6', yellow: '#f2c14e', green: '#7bb374', pink: '#f0a3b5',
                   orange: '#f09a4b', purple: '#a58bd6', white: '#ffffff', sky: '#a9d3ea' };
export const COLORS = [C.red, C.blue, C.yellow, C.green, C.pink, C.orange, C.purple];
export const FONT = '"Marker Felt","Chalkboard SE","Bradley Hand","Comic Sans MS",cursive';

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = t => 1 - (1 - t) ** 3;
export const easeInOut = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

export function rng(seed) {
  let a = Math.imul(seed | 0, 2654435761) ^ 0x9e3779b9;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- mounted state ----------
export let W = 1080, H = 1080;
let canvas, ctx, paper, img = null;
let BOIL = 0;        // changes 8×/s → every stroke re-jitters like frame-by-frame animation
let ALPHA = 1;       // global alpha multiplier for fading whole elements
let SEED_CURSOR = 0; // auto seed: reset per element each frame, so draw order == jitter identity
const els = [];      // { t0, dur, layer, draw(tLocal, reveal, fillIn) }

// photo: { cx, cy, size } drawn as a `size` px square; box = alpha bounding box of the cutout in canvas px
export const photo = { cx: 0, cy: 0, size: 0, box: { top: 0, bottom: 0, left: 0, right: 0 } };

// ---------- geometry (all return polylines: [[x,y],...]) ----------
export const arc = (cx, cy, rx, a0, a1, n = 24, ry = rx) =>
  Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
export const circle = (cx, cy, r, n = 24) => arc(cx, cy, r, 0, TAU, n);
export const ellipse = (cx, cy, rx, ry, n = 24) => arc(cx, cy, rx, 0, TAU, n, ry);
export const line = (x0, y0, x1, y1, n = 8) => Array.from({ length: n + 1 }, (_, i) => [lerp(x0, x1, i / n), lerp(y0, y1, i / n)]);
export const quad = (p0, p1, p2, n = 16) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
});
export const poly = (...pts) => pts;
export const heart = (s = 1, n = 32) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n * TAU;
  return [16 * Math.sin(t) ** 3 * s, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s];
});
export const star4 = (r, inner = .28) => Array.from({ length: 9 }, (_, i) => {
  const a = i * TAU / 8 - PI / 2, rr = i % 2 ? r * inner : r;
  return [Math.cos(a) * rr, Math.sin(a) * rr];
});
export const roundRect = (x, y, w, h, r) => [
  ...arc(x + w - r, y + r, r, -PI / 2, 0, 4), ...arc(x + w - r, y + h - r, r, 0, PI / 2, 4),
  ...arc(x + r, y + h - r, r, PI / 2, PI, 4), ...arc(x + r, y + r, r, PI, PI * 1.5, 4)];

// ---------- sketchy rendering ----------
const jit = (pts, amt, seed) => { const r = rng(seed); return pts.map(([x, y]) => [x + (r() - .5) * amt * 2, y + (r() - .5) * amt * 2]); };
function revealPts(pts, r) {
  if (r >= 1) return pts;
  const f = (pts.length - 1) * r, i = Math.floor(f), k = f - i;
  const out = pts.slice(0, i + 1);
  if (i < pts.length - 1) out.push([lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]);
  return out;
}
function path(p) { ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); }

// stroke(pts, { color, width, alpha, jitter, seed, reveal, close, dash })
// `seed` is optional: without it each call takes the next auto seed for the current element.
export function stroke(pts, o = {}) {
  const { color = INK, width = 3.4, alpha = 1, jitter = 1.5, seed = SEED_CURSOR++, reveal = 1, close = false, dash = null } = o;
  if (reveal <= 0 || alpha <= 0) return;
  const vis = revealPts(close ? [...pts, pts[0]] : pts, reveal);
  if (vis.length < 2) return;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
  ctx.setLineDash(dash || []);
  for (let pass = 0; pass < 2; pass++) {
    path(jit(vis, jitter * (pass ? 1.6 : 1), seed * 7919 + pass * 131 + BOIL * 17));
    ctx.lineWidth = width * (pass ? .65 : 1);
    ctx.globalAlpha = ALPHA * alpha * (pass ? .35 : 1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.setLineDash([]);
}
// fill(pts, color, { alpha, seed, reveal }) — two offset translucent passes
export function fill(pts, color, o = {}) {
  const { alpha = .45, seed = SEED_CURSOR++, reveal = 1 } = o;
  if (reveal <= 0 || alpha <= 0) return;
  for (let pass = 0; pass < 2; pass++) {
    const r = rng(seed * 31 + pass * 7 + BOIL);
    const ox = (r() - .5) * 6 + (pass ? 3 : 0), oy = (r() - .5) * 6 + (pass ? -2 : 0);
    path(jit(pts, 2, seed * 3 + pass + BOIL).map(([x, y]) => [x + ox, y + oy]));
    ctx.closePath();
    ctx.fillStyle = color; ctx.globalAlpha = ALPHA * alpha * reveal * (pass ? .55 : 1);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
// shape(pts, color, { fillIn, fillAlpha, ...strokeOpts }) — closed outline + marker fill in one call.
// `reveal` drives the outline, `fillIn` the colour (usually the element's r and f).
export function shape(pts, color, o = {}) {
  const { fillIn = 1, fillAlpha = .45, ...s } = o;
  if (color) fill(pts, color, { alpha: fillAlpha, reveal: fillIn });
  stroke(pts, { close: true, ...s });
}
export function text(str, x, y, o = {}) {
  const { size = 32, color = INK, alpha = 1, seed = SEED_CURSOR++ } = o;
  if (alpha <= 0) return;
  const r = rng(seed * 17 + BOIL);
  ctx.save();
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color; ctx.globalAlpha = ALPHA * alpha;
  ctx.translate(x + (r() - .5) * 2, y + (r() - .5) * 2); ctx.rotate((r() - .5) * .04);
  ctx.fillText(str, 0, 0);
  ctx.restore();
}
export function at(x, y, rot, sc, fn) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); fn(); ctx.restore(); }
export function withAlpha(a, fn) { const p = ALPHA; ALPHA *= a; fn(); ALPHA = p; }
// reveal for the i-th of n strokes when the whole element is `r` revealed
export const seq = (i, n, r) => clamp(r * n - i);

// ---------- timeline ----------
// add(t0, dur, draw(tLocal, reveal, fillIn), layer) — reveal ramps 0→1 over dur, fillIn over the .4 s after
export const add = (t0, dur, draw, layer = 'front') => els.push({ t0, dur, draw, layer });

// ---------- paper + photo ----------
function makePaper() {
  paper = document.createElement('canvas'); paper.width = W; paper.height = H;
  const p = paper.getContext('2d');
  p.fillStyle = '#f3ead3'; p.fillRect(0, 0, W, H);
  const r = rng(5); p.globalAlpha = .07;
  for (let i = 0; i < W * H / 45; i++) { p.fillStyle = r() < .5 ? '#000' : '#fff'; p.fillRect(r() * W, r() * H, 1.5, 1.5); }
  p.globalAlpha = 1;
  const g = p.createRadialGradient(W / 2, H / 2, W * .35, W / 2, H / 2, W * .8);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(70,45,10,.2)');
  p.fillStyle = g; p.fillRect(0, 0, W, H);
}
function loadPhoto(spec, base) {
  Object.assign(photo, { cx: spec.cx, cy: spec.cy, size: spec.size });
  return new Promise(res => {
    img = new Image();
    img.onload = () => { photo.box = alphaBox(img, spec); res(); };
    img.onerror = () => { console.error('photo failed to load:', img.src); img = null; res(); };
    img.src = base + spec.file;
  });
}
// alpha bounding box of the cutout, in canvas px (so scenes can anchor to the subject's edges)
function alphaBox(im, { cx, cy, size }) {
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0, n, n);
  const d = g.getImageData(0, 0, n, n).data;
  let x0 = n, y0 = n, x1 = -1, y1 = -1;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[(y * n + x) * 4 + 3] > 24) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return { top: cy - size / 2, bottom: cy + size / 2, left: cx - size / 2, right: cx + size / 2 };
  const k = size / n, ox = cx - size / 2, oy = cy - size / 2;
  return { left: ox + x0 * k, right: ox + (x1 + 1) * k, top: oy + y0 * k, bottom: oy + (y1 + 1) * k };
}
function drawPhoto() {
  if (!img) return;
  const { cx, cy, size, box } = photo;
  ctx.save();
  ctx.globalAlpha = .28; ctx.fillStyle = '#4a3a20'; ctx.filter = 'blur(14px)';
  ctx.beginPath(); ctx.ellipse(cx, box.bottom + 4, (box.right - box.left) * .52, 14, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
}

// ---------- frame ----------
function drawLayer(t, layer) {
  els.forEach((e, i) => {
    if (e.layer !== layer) return;
    const lt = t - e.t0; if (lt < 0) return;
    SEED_CURSOR = i * 4096;
    e.draw(lt, clamp(lt / e.dur), clamp((lt - e.dur) / .4));
  });
}
export function render(t) {
  BOIL = Math.floor(t * 8);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(paper, 0, 0);
  drawLayer(t, 'back');
  drawPhoto();
  drawLayer(t, 'front');
}
// QA: overlay many moments on one paper (motion-trail composite)
export function renderMotion(times, alpha = .3) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(paper, 0, 0);
  const pass = layer => { for (const t of times) { BOIL = Math.floor(t * 8); ALPHA = alpha; drawLayer(t, layer); } ALPHA = 1; };
  pass('back'); drawPhoto(); pass('front');
}

// ---------- mount ----------
// scene: { title, duration, size?, photo?: { file, cx, cy, size }, build(k) }
// base: URL prefix of the scene folder (for the photo)
export async function mount(scene, cv, base = '') {
  canvas = cv; ctx = canvas.getContext('2d');
  W = H = scene.size ?? 1080; canvas.width = W; canvas.height = H;
  makePaper();
  if (scene.photo) await loadPhoto(scene.photo, base);
  else photo.box = { top: 0, bottom: H, left: 0, right: W };
  els.length = 0;
  scene.build(api());
  return { render, renderMotion, duration: scene.duration };
}
// the API handed to scene.build — everything here is also a named export
function api() {
  return { W, H, PI, TAU, INK, C, COLORS, FONT, clamp, lerp, easeOut, easeInOut, rng,
           arc, circle, ellipse, line, quad, poly, heart, star4, roundRect,
           stroke, fill, shape, text, at, withAlpha, seq, add, photo };
}
