// Template scene — copy this folder to start a new animation:
//   cp -r scenes/template scenes/<name>; add a keyed photo.png (npm run key -- in.jpg scenes/<name>/photo.png)
//   then: npm run preview -- <name>   ·   npm run sheet -- <name>   ·   npm run render -- <name>
// It also doubles as the kit's smoke test (no photo, stock doodles only).
import * as d from '../../lib/doodles.js';

export default {
  title: 'Template',
  duration: 6,
  photo: null,   // → { file: 'photo.png', cx: 540, cy: 620, size: 620 }. photo.box then gives the cutout's edges.

  build({ W, H, C, circle, arc, PI, TAU, shape, stroke, at, seq, add, photo }) {
    const GROUND = photo.box.bottom - 120;   // with a photo: photo.box.bottom + 5 puts the horizon under the subject

    // stock backdrop, staggered draw-on (t0, dur). 'back' layer draws behind the photo.
    add(0, .9, d.ground({ y: GROUND }));
    add(.4, 1.2, d.sun({ x: 900, y: 220 }));
    add(.8, 1, d.cloud({ x: 200, y: 260 }));
    [[300, 500], [780, 420], [540, 300]].forEach(([x, y], i) => add(1.6 + i * .1, .4, d.sparkle({ x, y, phase: i })));
    add(2, .6, d.confetti({ n: 10 }));

    // a custom element: draw(t, r, f) — r ramps 0→1 over dur (outline), f over the next .4 s (colour).
    // seq(i, n, r) reveals the i-th of n strokes in order; no seeds needed, the engine allots them per call.
    add(1.2, 1.4, (t, r, f) => at(W / 2, GROUND - 90, Math.sin(t * 2) * .05, 1, () => {
      shape(circle(0, 0, 70, 28), C.yellow, { fillIn: f, reveal: seq(0, 3, r) });
      stroke(arc(-24, -12, 6, PI, TAU, 6), { width: 2.8, reveal: seq(1, 3, r) });
      stroke(arc(24, -12, 6, PI, TAU, 6), { width: 2.8, reveal: seq(1, 3, r) });
      stroke(arc(0, 8, 30, PI * .15, PI * .85, 12), { reveal: seq(2, 3, r) });
    }));
  },
};
