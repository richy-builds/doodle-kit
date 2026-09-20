// lib/doodles.js — stock doodles. Each factory returns a draw(t, r, f) function
// for add(t0, dur, draw[, layer]); several are also handy to call from inside
// another element's draw (e.g. heartsRising inside a character).
import { W, H, PI, TAU, INK, C, COLORS, clamp, lerp, easeOut, rng,
         arc, circle, ellipse, line, quad, poly, heart, star4, roundRect,
         stroke, fill, shape, text, at, withAlpha, seq } from './engine.js';

// horizon squiggle with grass tufts. tufts: positions as 0..1 across the width
export function ground({ y, tufts = [.06, .2, .34, .62, .72, .94], margin = 40 } = {}) {
  const g = Array.from({ length: 70 }, (_, i) => { const x = lerp(margin, W - margin, i / 69); return [x, y + Math.sin(i * .8) * 3]; });
  const ts = tufts.map(u => { const x = lerp(margin, W - margin, u); return poly([x - 9, y], [x - 4, y - 16], [x, y - 2], [x + 4, y - 22], [x + 9, y]); });
  return (t, r) => {
    stroke(g, { reveal: seq(0, 2, r) });
    ts.forEach(p => stroke(p, { width: 2.6, reveal: seq(1, 2, r) }));
  };
}

// striped rug in perspective, its far edge on y. Usually a 'back' layer element.
export function rug({ y, left = 150, right = 930, depth = 100, flare = 110, colors = [C.sky, C.pink], stripes = 8 } = {}) {
  const B = y + depth, edge = poly([left, y], [right, y], [right + flare, B], [left - flare, B]);
  return (t, r, f) => {
    for (let i = 0; i < stripes; i++) {
      const u0 = i / stripes, u1 = (i + 1) / stripes;
      const s = poly([lerp(left, right, u0), y], [lerp(left, right, u1), y], [lerp(left - flare, right + flare, u1), B], [lerp(left - flare, right + flare, u0), B]);
      fill(s, colors[i % colors.length], { alpha: .28, reveal: f });
      if (i) stroke(line(lerp(left, right, u0), y, lerp(left - flare, right + flare, u0), B, 6), { width: 2.2, alpha: .7, reveal: seq(1, 2, r) });
    }
    stroke(edge, { close: true, width: 3, reveal: seq(0, 2, r) });
    for (let i = 0; i < 9; i++) {  // fringe
      const yy = y + 8 + i * 11, k = (yy - y) / depth;
      stroke(line(lerp(left, left - flare, k), yy, lerp(left, left - flare, k) - 14, yy + 4, 2), { width: 2.2, reveal: seq(1, 2, r) });
      stroke(line(lerp(right, right + flare, k), yy, lerp(right, right + flare, k) + 14, yy + 4, 2), { width: 2.2, reveal: seq(1, 2, r) });
    }
  };
}

// mountain range polyline (first/last point on the ground) with optional snow-cap zigzags
export function mountains({ pts, snow = [], color = C.purple } = {}) {
  return (t, r, f) => {
    fill(pts, color, { alpha: .16, reveal: f });
    stroke(pts, { width: 3, reveal: seq(0, 2, r) });
    snow.forEach(s => stroke(s, { width: 2.6, reveal: seq(1, 2, r) }));
  };
}

// sun with a face; rays slowly turn
export function sun({ x, y, r: R = 44 } = {}) {
  const k = R / 44;
  return (t, r, f) => at(x, y, 0, k, () => {
    const disc = circle(0, 0, 44);
    fill(disc, C.yellow, { alpha: .6, reveal: f });
    stroke(disc, { close: true, reveal: seq(0, 3, r) });
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12 + t * .25, len = 72 + (i % 2) * 8;
      stroke(line(Math.cos(a) * 56, Math.sin(a) * 56, Math.cos(a) * len, Math.sin(a) * len, 4), { width: 3, reveal: seq(1, 3, r) });
    }
    stroke(arc(0, 6, 17, PI * .15, PI * .85, 12), { width: 2.8, reveal: seq(2, 3, r) });
    stroke(arc(-15, -6, 5, PI, TAU, 6), { width: 2.6, reveal: seq(2, 3, r) });
    stroke(arc(15, -6, 5, PI, TAU, 6), { width: 2.6, reveal: seq(2, 3, r) });
    fill(circle(-24, 8, 7, 10), C.pink, { alpha: .5, reveal: f });
    fill(circle(24, 8, 7, 10), C.pink, { alpha: .5, reveal: f });
  });
}

// drifting cloud. phase offsets the drift so several clouds don't move in lockstep
export function cloud({ x, y, s = 1, phase = 0, drift = 16 } = {}) {
  return (t, r, f) => at(x + Math.sin(t * .4 + phase) * drift, y, 0, s, () => {
    const c = [arc(-30, 0, 20, PI, TAU, 12), arc(0, -10, 28, PI, TAU, 16), arc(30, 0, 20, PI, TAU, 12), line(50, 0, -50, 0, 6)];
    fill(c.flat(), C.white, { alpha: .75, reveal: f });
    c.forEach((p, i) => stroke(p, { width: 3, reveal: seq(i, 4, r) }));
  });
}

// little pictures for polaroid frames: (reveal) => void, drawn at the frame's centre
export const INNERS = [
  r => stroke(heart(.75), { close: true, width: 2.2, reveal: r }),
  r => stroke(star4(15), { close: true, width: 2.2, reveal: r }),
  r => { stroke(circle(0, 0, 15, 16), { close: true, width: 2.2, reveal: seq(0, 2, r) });          // smiley
         stroke(arc(0, 2, 8, PI * .2, PI * .8, 8), { width: 2, reveal: seq(1, 2, r) });
         stroke(line(-6, -5, -6, -3, 2), { width: 2.4, reveal: seq(1, 2, r) });
         stroke(line(6, -5, 6, -3, 2), { width: 2.4, reveal: seq(1, 2, r) }); },
  r => { stroke(ellipse(0, 4, 16, 9, 16), { close: true, width: 2.2, reveal: seq(0, 2, r) });      // cat face
         stroke(arc(0, -14, 12, PI * .1, PI * .9, 8), { width: 2.2, reveal: seq(1, 2, r) }); },
];

// one polaroid; origin at the top-centre of the frame. Call inside a transform.
export function polaroid(color, inner, rev, fillIn) {
  const frame = roundRect(-32, 0, 64, 78, 4), sq = poly([-25, 7], [25, 7], [25, 57], [-25, 57]);
  shape(frame, C.white, { fillAlpha: .85, fillIn, width: 2.6, reveal: seq(0, 3, rev) });
  shape(sq, color, { fillAlpha: .55, fillIn, width: 2.2, reveal: seq(1, 3, rev) });
  at(0, 32, 0, 1, () => inner(seq(2, 3, rev)));
}

// a sagging string across the canvas with polaroids pegged along it, gently swinging
export function polaroidString({ y = 82, sag = 46, pegs = [90, 250, 410, 670, 830, 990] } = {}) {
  const string = quad([-10, y], [W / 2, y + sag], [W + 10, y], 40);
  return (t, r, f) => {
    stroke(string, { width: 2.6, reveal: seq(0, 2, r) });
    pegs.forEach((x, i) => {
      const p = string[Math.round(clamp(x / W) * 40)];
      at(p[0], p[1], Math.sin(t * 1.6 + i * 1.3) * .08, 1, () => {
        stroke(line(0, -6, 0, 6, 2), { width: 4, reveal: seq(1 + i, pegs.length + 2, r) });
        at(0, 5, 0, 1, () => polaroid(COLORS[(i * 2) % 7], INNERS[i % 4], seq(1 + i, pegs.length + 2, r), f));
      });
    });
  };
}

// hearts floating up from (x, y) and fading; only once the parent element is filled in (f > 0)
export function heartsRising({ x, y, n = 4, rise = 380 } = {}) {
  return (t, r, f) => {
    if (f <= 0 || t < 1) return;
    for (let k = 0; k < n; k++) {
      const ph = ((t - 1) * .22 + k / n) % 1;
      const xx = x - 20 + Math.sin(ph * 7 + k * 2) * 26 + (k % 2) * 28, yy = y - ph * rise;
      const a = f * (1 - ph * ph), s = .55 + (k % 3) * .2;
      withAlpha(a, () => at(xx, yy, Math.sin(ph * 5 + k) * .25, s * (.5 + .5 * clamp(ph * 5)), () =>
        shape(heart(1.4), k % 2 ? C.red : C.pink, { fillAlpha: .8, width: 3 })));
    }
  };
}

// paper plane following path(t) => [x, y] with a dotted trail behind it
export function paperPlane({ path } = {}) {
  return (t, r, f) => {
    if (f > 0) stroke(Array.from({ length: 34 }, (_, i) => path(t - .08 - i * .07)), { width: 2.4, alpha: .65 * f, dash: [1, 11], jitter: .8 });
    const [x, y] = path(t), [x2, y2] = path(t + .02), hd = Math.atan2(y2 - y, x2 - x);
    at(x, y, hd + Math.sin(t * 6) * .08, 1, () => {
      shape(poly([0, 0], [-44, -14], [-32, 0]), C.white, { fillAlpha: .9, fillIn: f, width: 3, reveal: seq(0, 2, r) });
      shape(poly([0, 0], [-44, 16], [-32, 0]), C.sky, { fillAlpha: .7, fillIn: f, width: 3, reveal: seq(1, 2, r) });
    });
  };
}

// one twinkling 4-point sparkle; give each a different phase
export function sparkle({ x, y, phase = 0, r: R = 16, color = C.yellow } = {}) {
  return (t, r) => {
    const tw = .5 + .5 * Math.sin(t * 3.5 + phase * 1.7);
    at(x, y, Math.sin(t + phase) * .3, .55 + .5 * tw, () => {
      fill(star4(R), color, { alpha: .7 * tw }); stroke(star4(R), { close: true, width: 2.6, reveal: r });
    });
  };
}

// falling, tumbling confetti rectangles
export function confetti({ n = 14, seed = 99, colors = COLORS, margin = 40 } = {}) {
  const cr = rng(seed);
  const conf = Array.from({ length: n }, (_, i) => ({ x: margin + cr() * (W - margin * 2), off: cr() * H, sp: .6 + cr() * .7, ph: cr() * TAU, c: colors[i % colors.length], w: 8 + cr() * 8 }));
  return (t, r) => conf.forEach(c => {
    const y = ((t * 95 * c.sp + c.off) % (H + 60)) - 30, x = c.x + Math.sin(t * 1.5 + c.ph) * 25;
    at(x, y, t * 2.5 + c.ph, 1, () => shape(poly([-c.w / 2, -4], [c.w / 2, -4], [c.w / 2, 4], [-c.w / 2, 4]), c.c, { fillAlpha: .85 * r, width: 2, alpha: r }));
  });
}

// camera-flash style burst at (x, y), lives for `life` seconds. Use add(t, .001, flashBurst(...))
export function flashBurst({ x, y, life = .8, color = C.white } = {}) {
  return t => {
    if (t > life) return;
    const p = t / life, pop = easeOut(clamp(t / .25)), a = 1 - p * p;
    at(x, y, t * 2, .4 + .6 * pop, () => withAlpha(a, () => {
      shape(star4(70, .35), color, { fillAlpha: .95, width: 3, jitter: 2 });
      for (let i = 0; i < 8; i++) { const an = i * TAU / 8 + PI / 8; stroke(line(Math.cos(an) * 84, Math.sin(an) * 84, Math.cos(an) * (100 + 40 * pop), Math.sin(an) * (100 + 40 * pop), 3), { width: 3 }); }
    }));
  };
}

// a word that pops in and fades, comic style. Same lifetime shape as flashBurst
export function popText(str, { x, y, rot = -.15, size = 46, life = .8, color = INK } = {}) {
  return t => {
    if (t > life) return;
    const p = t / life, pop = easeOut(clamp(t / .25)), a = 1 - p * p;
    at(x, y, rot, .6 + .4 * pop, () => text(str, 0, 0, { size, alpha: a, color }));
  };
}
