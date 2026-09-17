// doodle.js — a tiny hand-drawn doodle engine + the "Say cheese!" scene.
// Everything is a polyline: strokes are drawn twice with seeded jitter that is
// re-seeded 8×/s (the "boil"), revealed by prefix for the draw-on, and filled
// with offset translucent polygons so the colouring-in looks a little careless.

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height, PI = Math.PI, TAU = PI * 2;
const DURATION = 15;

const INK = '#2a2622';
const C = { red: '#e2574c', blue: '#5b8fd6', yellow: '#f2c14e', green: '#7bb374', pink: '#f0a3b5',
            orange: '#f09a4b', purple: '#a58bd6', white: '#ffffff', sky: '#a9d3ea' };
const COLORS = [C.red, C.blue, C.yellow, C.green, C.pink, C.orange, C.purple];
const FONT = '"Marker Felt","Chalkboard SE","Bradley Hand","Comic Sans MS",cursive';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - (1 - t) ** 3;
const easeInOut = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

function rng(seed) {
  let a = Math.imul(seed | 0, 2654435761) ^ 0x9e3779b9;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let BOIL = 0;   // changes 8×/s → every stroke re-jitters like frame-by-frame animation
let ALPHA = 1;  // global alpha multiplier for fading whole elements

// ---------- geometry (all return polylines: [[x,y],...]) ----------
const arc = (cx, cy, rx, a0, a1, n = 24, ry = rx) =>
  Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const circle = (cx, cy, r, n = 24) => arc(cx, cy, r, 0, TAU, n);
const ellipse = (cx, cy, rx, ry, n = 24) => arc(cx, cy, rx, 0, TAU, n, ry);
const line = (x0, y0, x1, y1, n = 8) => Array.from({ length: n + 1 }, (_, i) => [lerp(x0, x1, i / n), lerp(y0, y1, i / n)]);
const quad = (p0, p1, p2, n = 16) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
});
const poly = (...pts) => pts;
const heart = (s = 1, n = 32) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n * TAU;
  return [16 * Math.sin(t) ** 3 * s, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s];
});
const star4 = (r, inner = .28) => Array.from({ length: 9 }, (_, i) => {
  const a = i * TAU / 8 - PI / 2, rr = i % 2 ? r * inner : r;
  return [Math.cos(a) * rr, Math.sin(a) * rr];
});
const roundRect = (x, y, w, h, r) => [
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

function stroke(pts, o = {}) {
  const { color = INK, width = 3.4, alpha = 1, jitter = 1.5, seed = 1, reveal = 1, close = false, dash = null } = o;
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
function fill(pts, color, o = {}) {
  const { alpha = .45, seed = 1, reveal = 1 } = o;
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
function text(str, x, y, o = {}) {
  const { size = 32, color = INK, alpha = 1, seed = 1 } = o;
  if (alpha <= 0) return;
  const r = rng(seed * 17 + BOIL);
  ctx.save();
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color; ctx.globalAlpha = ALPHA * alpha;
  ctx.translate(x + (r() - .5) * 2, y + (r() - .5) * 2); ctx.rotate((r() - .5) * .04);
  ctx.fillText(str, 0, 0);
  ctx.restore();
}
function at(x, y, rot, sc, fn) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); fn(); ctx.restore(); }
function withAlpha(a, fn) { const p = ALPHA; ALPHA *= a; fn(); ALPHA = p; }
// reveal for the i-th of n strokes when the whole element is `r` revealed
const seq = (i, n, r) => clamp(r * n - i);

// ---------- paper ----------
const paper = document.createElement('canvas'); paper.width = W; paper.height = H;
{
  const p = paper.getContext('2d');
  p.fillStyle = '#f3ead3'; p.fillRect(0, 0, W, H);
  const r = rng(5); p.globalAlpha = .07;
  for (let i = 0; i < 26000; i++) { p.fillStyle = r() < .5 ? '#000' : '#fff'; p.fillRect(r() * W, r() * H, 1.5, 1.5); }
  p.globalAlpha = 1;
  const g = p.createRadialGradient(W / 2, H / 2, W * .35, W / 2, H / 2, W * .8);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(70,45,10,.2)');
  p.fillStyle = g; p.fillRect(0, 0, W, H);
}

// ---------- photo ----------
const img = new Image();
const PH = { cx: 540, cy: 620, s: 620 };            // the camera cutout, drawn `s` px square
const CAM = { top: 333, bottom: 911, left: 379, right: 726, lens: [549, 697], finder: [549, 507] };
const GROUND = 916;
function drawPhoto() {
  if (!img.complete || !img.naturalWidth) return;
  ctx.save();
  ctx.globalAlpha = .28; ctx.fillStyle = '#4a3a20'; ctx.filter = 'blur(14px)';
  ctx.beginPath(); ctx.ellipse(PH.cx, CAM.bottom + 4, PH.s * .29, 14, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.drawImage(img, PH.cx - PH.s / 2, PH.cy - PH.s / 2, PH.s, PH.s);
}

// ---------- scene ----------
// element: { t0, dur, layer, draw(tLocal, reveal, fillIn) }
const els = [];
const add = (t0, dur, draw, layer = 'front') => els.push({ t0, dur, draw, layer });

// ground + grass
{
  const ground = Array.from({ length: 70 }, (_, i) => { const x = lerp(40, W - 40, i / 69); return [x, GROUND + Math.sin(i * .8) * 3]; });
  const tufts = [.06, .2, .34, .62, .72, .94].map(u => {
    const x = lerp(40, W - 40, u);
    return poly([x - 9, GROUND], [x - 4, GROUND - 16], [x, GROUND - 2], [x + 4, GROUND - 22], [x + 9, GROUND]);
  });
  add(0, .9, (t, r) => {
    stroke(ground, { seed: 1, reveal: seq(0, 2, r) });
    tufts.forEach((p, i) => stroke(p, { seed: 2 + i, width: 2.6, reveal: seq(1, 2, r) }));
  });
}

// striped rug the camera stands on — behind everything
{
  const L = 150, R = 930, B = GROUND + 100, OUT = 110;
  const edge = poly([L, GROUND], [R, GROUND], [R + OUT, B], [L - OUT, B]);
  add(.2, 1.2, (t, r, f) => {
    for (let i = 0; i < 8; i++) {
      const u0 = i / 8, u1 = (i + 1) / 8;
      const s = poly([lerp(L, R, u0), GROUND], [lerp(L, R, u1), GROUND], [lerp(L - OUT, R + OUT, u1), B], [lerp(L - OUT, R + OUT, u0), B]);
      fill(s, i % 2 ? C.pink : C.sky, { seed: 5 + i, alpha: .28, reveal: f });
      if (i) stroke(line(lerp(L, R, u0), GROUND, lerp(L - OUT, R + OUT, u0), B, 6), { seed: 5 + i, width: 2.2, alpha: .7, reveal: seq(1, 2, r) });
    }
    stroke(edge, { seed: 4, close: true, width: 3, reveal: seq(0, 2, r) });
    for (let i = 0; i < 9; i++) {  // fringe
      const y = GROUND + 8 + i * 11, k = (y - GROUND) / (B - GROUND);
      stroke(line(lerp(L, L - OUT, k), y, lerp(L, L - OUT, k) - 14, y + 4, 2), { seed: 14 + i, width: 2.2, reveal: seq(1, 2, r) });
      stroke(line(lerp(R, R + OUT, k), y, lerp(R, R + OUT, k) + 14, y + 4, 2), { seed: 24 + i, width: 2.2, reveal: seq(1, 2, r) });
    }
  }, 'back');
}

// mountains — behind the camera
{
  const m = poly([40, GROUND], [150, 800], [230, 850], [340, 730], [430, 810], [540, 700], [660, 800], [760, 740], [860, 840], [930, 790], [W - 40, GROUND]);
  const snow = [[[340, 730], [318, 762], [334, 756], [350, 770], [366, 758]], [[540, 700], [514, 736], [530, 730], [548, 744], [566, 730]]];
  add(.3, 1.2, (t, r, f) => {
    fill(m, C.purple, { seed: 10, alpha: .16, reveal: f });
    stroke(m, { seed: 10, width: 3, reveal: seq(0, 2, r) });
    snow.forEach((s, i) => stroke(s, { seed: 11 + i, width: 2.6, reveal: seq(1, 2, r) }));
  }, 'back');
}

// sun with a face, rays slowly turning
add(.9, 1.2, (t, r, f) => at(955, 262, 0, 1, () => {
  const disc = circle(0, 0, 44);
  fill(disc, C.yellow, { seed: 20, alpha: .6, reveal: f });
  stroke(disc, { seed: 20, close: true, reveal: seq(0, 3, r) });
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12 + t * .25, len = 72 + (i % 2) * 8;
    stroke(line(Math.cos(a) * 56, Math.sin(a) * 56, Math.cos(a) * len, Math.sin(a) * len, 4), { seed: 21 + i, width: 3, reveal: seq(1, 3, r) });
  }
  stroke(arc(0, 6, 17, PI * .15, PI * .85, 12), { seed: 34, width: 2.8, reveal: seq(2, 3, r) });
  stroke(arc(-15, -6, 5, PI, TAU, 6), { seed: 35, width: 2.6, reveal: seq(2, 3, r) });
  stroke(arc(15, -6, 5, PI, TAU, 6), { seed: 36, width: 2.6, reveal: seq(2, 3, r) });
  fill(circle(-24, 8, 7, 10), C.pink, { seed: 37, alpha: .5, reveal: f });
  fill(circle(24, 8, 7, 10), C.pink, { seed: 38, alpha: .5, reveal: f });
}));

// clouds drifting
{
  const cloud = () => [arc(-30, 0, 20, PI, TAU, 12), arc(0, -10, 28, PI, TAU, 16), arc(30, 0, 20, PI, TAU, 12), line(50, 0, -50, 0, 6)];
  [[150, 275, 1], [790, 335, .75]].forEach(([x, y, s], k) => add(1.3 + k * .3, 1, (t, r, f) => at(x + Math.sin(t * .4 + k * 2) * 16, y, 0, s, () => {
    const c = cloud();
    fill(c.flat(), C.white, { seed: 40 + k, alpha: .75, reveal: f });
    c.forEach((p, i) => stroke(p, { seed: 40 + k * 5 + i, width: 3, reveal: seq(i, 4, r) }));
  })));
}

// polaroids pegged on a string across the top
function polaroid(color, seed, inner, rev, fillIn) {  // origin: top-centre of the frame
  const frame = roundRect(-32, 0, 64, 78, 4), sq = poly([-25, 7], [25, 7], [25, 57], [-25, 57]);
  fill(frame, C.white, { seed, alpha: .85, reveal: fillIn });
  stroke(frame, { seed, close: true, width: 2.6, reveal: seq(0, 3, rev) });
  fill(sq, color, { seed: seed + 1, alpha: .55, reveal: fillIn });
  stroke(sq, { seed: seed + 1, close: true, width: 2.2, reveal: seq(1, 3, rev) });
  at(0, 32, 0, 1, () => inner(seq(2, 3, rev), seed + 2));
}
const INNERS = [
  (r, s) => stroke(heart(.75), { seed: s, close: true, width: 2.2, reveal: r }),
  (r, s) => stroke(star4(15), { seed: s, close: true, width: 2.2, reveal: r }),
  (r, s) => { stroke(circle(0, 0, 15, 16), { seed: s, close: true, width: 2.2, reveal: seq(0, 2, r) });
              stroke(arc(0, 2, 8, PI * .2, PI * .8, 8), { seed: s + 1, width: 2, reveal: seq(1, 2, r) });
              stroke(line(-6, -5, -6, -3, 2), { seed: s + 2, width: 2.4, reveal: seq(1, 2, r) });
              stroke(line(6, -5, 6, -3, 2), { seed: s + 3, width: 2.4, reveal: seq(1, 2, r) }); },
  (r, s) => { stroke(ellipse(0, 4, 16, 9, 16), { seed: s, close: true, width: 2.2, reveal: seq(0, 2, r) });
              stroke(arc(0, -14, 12, PI * .1, PI * .9, 8), { seed: s + 1, width: 2.2, reveal: seq(1, 2, r) }); },
];
{
  const string = quad([-10, 82], [540, 128], [W + 10, 82], 40);
  const pegs = [90, 250, 410, 670, 830, 990];
  add(1.6, 1.8, (t, r, f) => {
    stroke(string, { seed: 50, width: 2.6, reveal: seq(0, 2, r) });
    pegs.forEach((x, i) => {
      const p = string[Math.round(x / W * 40)];
      at(p[0], p[1], Math.sin(t * 1.6 + i * 1.3) * .08, 1, () => {
        stroke(line(0, -6, 0, 6, 2), { seed: 60 + i, width: 4, reveal: seq(1 + i, 8, r) });
        at(0, 5, 0, 1, () => polaroid(COLORS[(i * 2) % 7], 70 + i * 4, INNERS[i % 4], seq(1 + i, 8, r), f));
      });
    });
  });
}

// cat holding a "smile!" sign — bottom left
add(2.4, 1.8, (t, r, f) => {
  const hop = -Math.abs(Math.sin(t * 4)) * 8;
  at(175, GROUND + hop, 0, 1, () => {
    const body = ellipse(0, -44, 36, 46, 24), head = circle(0, -118, 36, 28);
    const earL = poly([-30, -138], [-26, -176], [-6, -146]), earR = poly([30, -138], [26, -176], [6, -146]);
    const tail = quad([32, -22], [82, -30 + Math.sin(t * 3) * 14], [64, -92 + Math.sin(t * 3) * 10], 12);
    fill(body, C.orange, { seed: 80, alpha: .4, reveal: f }); stroke(body, { seed: 80, close: true, reveal: seq(0, 8, r) });
    stroke(tail, { seed: 81, width: 3.2, reveal: seq(1, 8, r) });
    stroke(line(-14, 2, -14, 12, 2), { seed: 82, width: 3, reveal: seq(1, 8, r) }); stroke(line(14, 2, 14, 12, 2), { seed: 83, width: 3, reveal: seq(1, 8, r) });
    fill(head, C.orange, { seed: 84, alpha: .4, reveal: f }); stroke(head, { seed: 84, close: true, reveal: seq(2, 8, r) });
    fill(earL, C.pink, { seed: 85, alpha: .5, reveal: f }); fill(earR, C.pink, { seed: 86, alpha: .5, reveal: f });
    stroke(earL, { seed: 85, close: true, width: 3, reveal: seq(3, 8, r) }); stroke(earR, { seed: 86, close: true, width: 3, reveal: seq(3, 8, r) });
    [-14, 0, 14].forEach((sx, i) => stroke(line(sx, -150, sx * .8, -140, 2), { seed: 87 + i, width: 2.6, reveal: seq(3, 8, r) }));
    stroke(arc(-13, -120, 7, PI, TAU, 6), { seed: 90, width: 2.8, reveal: seq(4, 8, r) });   // happy eyes
    stroke(arc(13, -120, 7, PI, TAU, 6), { seed: 91, width: 2.8, reveal: seq(4, 8, r) });
    fill(poly([-4, -108], [4, -108], [0, -103]), C.pink, { seed: 92, alpha: .9, reveal: f });
    stroke(arc(-5, -103, 5, 0, PI, 6), { seed: 93, width: 2.4, reveal: seq(5, 8, r) });
    stroke(arc(5, -103, 5, 0, PI, 6), { seed: 94, width: 2.4, reveal: seq(5, 8, r) });
    [[-20, -110, -50, -114], [-20, -104, -50, -100], [20, -110, 50, -114], [20, -104, 50, -100]].forEach((l, i) =>
      stroke(line(...l, 3), { seed: 95 + i, width: 2.2, reveal: seq(5, 8, r) }));
    // arm + sign
    stroke(line(30, -72, 54, -122, 4), { seed: 100, width: 3.2, reveal: seq(6, 8, r) });
    stroke(line(54, -122, 54, -206, 6), { seed: 101, width: 3.2, reveal: seq(6, 8, r) });
    at(54, -206, Math.sin(t * 4) * .03, 1, () => {
      const board = roundRect(-70, -76, 140, 76, 8);
      fill(board, C.white, { seed: 102, alpha: .85, reveal: f });
      stroke(board, { seed: 102, close: true, width: 3, reveal: seq(7, 8, r) });
      text('smile!', 0, -38, { size: 40, alpha: f, seed: 103 });
    });
  });
});

// bird posing — bottom right (blinks, bow tie, hearts float up)
add(3.0, 1.4, (t, r, f) => {
  const bob = Math.sin(t * 3) * 4;
  at(905, GROUND, Math.sin(t * 3) * .03, 1, () => {
    const body = ellipse(0, -52 + bob * .3, 34, 44, 24), head = circle(-6, -112 + bob, 24, 22);
    fill(body, C.blue, { seed: 110, alpha: .45, reveal: f }); stroke(body, { seed: 110, close: true, reveal: seq(0, 7, r) });
    stroke(arc(6, -50, 16, PI * 1.1, PI * 1.95, 10, 10), { seed: 111, width: 3, reveal: seq(1, 7, r) });        // wing
    stroke(line(30, -60, 50, -76, 3), { seed: 112, reveal: seq(1, 7, r) }); stroke(line(30, -52, 52, -60, 3), { seed: 113, reveal: seq(1, 7, r) });
    stroke(line(-8, -10, -10, 0, 2), { seed: 114, width: 2.8, reveal: seq(2, 7, r) }); stroke(line(8, -10, 10, 0, 2), { seed: 115, width: 2.8, reveal: seq(2, 7, r) });
    stroke(line(-18, 0, -2, 0, 2), { seed: 116, width: 2.8, reveal: seq(2, 7, r) }); stroke(line(2, 0, 18, 0, 2), { seed: 117, width: 2.8, reveal: seq(2, 7, r) });
    fill(head, C.blue, { seed: 118, alpha: .45, reveal: f }); stroke(head, { seed: 118, close: true, reveal: seq(3, 7, r) });
    [[-12, -134, -20, -152], [-4, -136, -2, -156], [4, -134, 12, -150]].forEach((l, i) => stroke(line(...l, 3), { seed: 119 + i, width: 2.6, reveal: seq(3, 7, r) }));
    const beak = poly([-28, -116 + bob], [-46, -110 + bob], [-28, -104 + bob]);
    fill(beak, C.orange, { seed: 122, alpha: .85, reveal: f }); stroke(beak, { seed: 122, close: true, width: 2.6, reveal: seq(4, 7, r) });
    const blink = (t % 3.1) > 2.9;
    if (blink) stroke(line(-18, -118 + bob, -10, -118 + bob, 2), { seed: 123, width: 2.6, reveal: seq(4, 7, r) });
    else { fill(circle(-14, -118 + bob, 3.5, 8), INK, { seed: 123, alpha: .9, reveal: seq(4, 7, r) }); }
    // bow tie
    const bowL = poly([-6, -86], [-22, -96], [-22, -76]), bowR = poly([-6, -86], [10, -96], [10, -76]);
    fill(bowL, C.red, { seed: 124, alpha: .8, reveal: f }); fill(bowR, C.red, { seed: 125, alpha: .8, reveal: f });
    stroke(bowL, { seed: 124, close: true, width: 2.4, reveal: seq(5, 7, r) }); stroke(bowR, { seed: 125, close: true, width: 2.4, reveal: seq(5, 7, r) });
    stroke(circle(-6, -86, 3, 8), { seed: 126, close: true, width: 2.2, reveal: seq(6, 7, r) });
  });
  // hearts
  if (f > 0) for (let k = 0; k < 4; k++) {
    const ph = ((t - 1) * .22 + k / 4) % 1; if (t < 1) break;
    const x = 905 - 20 + Math.sin(ph * 7 + k * 2) * 26 + (k % 2) * 28, y = GROUND - 190 - ph * 380;
    const a = f * (1 - ph * ph), s = .55 + (k % 3) * .2;
    withAlpha(a, () => at(x, y, Math.sin(ph * 5 + k) * .25, s * (.5 + .5 * clamp(ph * 5)), () => {
      const h = heart(1.4);
      fill(h, k % 2 ? C.red : C.pink, { seed: 130 + k, alpha: .8 }); stroke(h, { seed: 130 + k, close: true, width: 3 });
    }));
  }
});

// paper plane looping around the camera with a dotted trail
add(3.6, .9, (t, r, f) => {
  const P = tt => { const a = -PI / 2 + tt * .55, w = 1 + .06 * Math.sin(tt * 2.3); return [540 + Math.cos(a) * 400 * w, 600 + Math.sin(a) * 290 * w]; };
  if (f > 0) {
    const trail = Array.from({ length: 34 }, (_, i) => P(t - .08 - i * .07));
    stroke(trail, { seed: 140, width: 2.4, alpha: .65 * f, dash: [1, 11], jitter: .8 });
  }
  const [x, y] = P(t), [x2, y2] = P(t + .02), hd = Math.atan2(y2 - y, x2 - x);
  at(x, y, hd + Math.sin(t * 6) * .08, 1, () => {
    const top = poly([0, 0], [-44, -14], [-32, 0]), bot = poly([0, 0], [-44, 16], [-32, 0]);
    fill(top, C.white, { seed: 141, alpha: .9, reveal: f }); fill(bot, C.sky, { seed: 142, alpha: .7, reveal: f });
    stroke(top, { seed: 141, close: true, width: 3, reveal: seq(0, 2, r) }); stroke(bot, { seed: 142, close: true, width: 3, reveal: seq(1, 2, r) });
  });
});

// sparkles twinkling around the camera
[[300, 380], [800, 250], [250, 580], [860, 600], [330, 820], [810, 760], [455, 280], [655, 270], [220, 460]].forEach(([x, y], i) =>
  add(4.0 + i * .1, .4, (t, r) => {
    const tw = .5 + .5 * Math.sin(t * 3.5 + i * 1.7);
    at(x, y, Math.sin(t + i) * .3, .55 + .5 * tw, () => {
      fill(star4(16), C.yellow, { seed: 150 + i, alpha: .7 * tw }); stroke(star4(16), { seed: 150 + i, close: true, width: 2.6, reveal: r });
    });
  }));

// confetti
{
  const cr = rng(99);
  const conf = Array.from({ length: 14 }, (_, i) => ({ x: 40 + cr() * (W - 80), off: cr() * H, sp: .6 + cr() * .7, ph: cr() * TAU, c: COLORS[i % 7], w: 8 + cr() * 8 }));
  add(4.4, .6, (t, r) => conf.forEach((c, i) => {
    const y = ((t * 95 * c.sp + c.off) % (H + 60)) - 30, x = c.x + Math.sin(t * 1.5 + c.ph) * 25;
    at(x, y, t * 2.5 + c.ph, 1, () => {
      const rect = poly([-c.w / 2, -4], [c.w / 2, -4], [c.w / 2, 4], [-c.w / 2, 4]);
      fill(rect, c.c, { seed: 170 + i, alpha: .85 * r }); stroke(rect, { seed: 170 + i, width: 2, close: true, alpha: r });
    });
  }));
}

// shutter clicks: flash burst on the taking lens + "click!", then a polaroid pops out of the top
const CLICKS = [5.2, 8.4, 11.6];
CLICKS.forEach((tc, k) => {
  add(tc, .001, t => {
    if (t > .8) return;
    const p = t / .8, pop = easeOut(clamp(t / .25)), a = 1 - p * p;
    at(CAM.lens[0], CAM.lens[1], t * 2, .4 + .6 * pop, () => withAlpha(a, () => {
      fill(star4(70, .35), C.white, { seed: 180 + k, alpha: .95 }); stroke(star4(70, .35), { seed: 180 + k, close: true, width: 3, jitter: 2 });
      for (let i = 0; i < 8; i++) { const an = i * TAU / 8 + PI / 8; stroke(line(Math.cos(an) * 84, Math.sin(an) * 84, Math.cos(an) * (100 + 40 * pop), Math.sin(an) * (100 + 40 * pop), 3), { seed: 190 + i, width: 3 }); }
    }));
    at(790, 660, -.15, .6 + .4 * pop, () => text('click!', 0, 0, { size: 46, alpha: a, seed: 200 + k }));
  });
  add(tc + .25, .001, t => {
    const D = 2.6; if (t > D) return;
    const p = t / D, e = easeInOut(clamp(p * 1.25));
    const x = 540 + Math.sin(p * 7) * 34 * p, y = CAM.top - 90 - e * 100, rot = Math.sin(p * 6) * .35, a = 1 - clamp((p - .7) / .3);
    withAlpha(a, () => at(x, y, rot, .6 + .4 * easeOut(clamp(t / .5)), () =>
      polaroid(COLORS[(k * 3 + 1) % 7], 210 + k * 5, INNERS[(k + 2) % 4], 1, 1)));
  });
});

// ---------- frame ----------
function render(t) {
  BOIL = Math.floor(t * 8);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(paper, 0, 0);
  const draw = layer => { for (const e of els) { if (e.layer !== layer) continue; const lt = t - e.t0; if (lt < 0) continue; e.draw(lt, clamp(lt / e.dur), clamp((lt - e.dur) / .4)); } };
  draw('back');
  drawPhoto();
  draw('front');
}
window.render = render;
window.ready = false;

let start = performance.now(), live = !new URLSearchParams(location.search).has('capture');
if (!live) document.body.classList.add('capture');
function frame(now) { render(((now - start) / 1000) % DURATION); requestAnimationFrame(frame); }
img.onload = () => { window.ready = true; if (live) requestAnimationFrame(frame); };
img.onerror = () => { window.ready = true; if (live) requestAnimationFrame(frame); };
img.src = 'photo.png';
document.getElementById('replay')?.addEventListener('click', () => { start = performance.now(); });
