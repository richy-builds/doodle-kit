// "Say cheese!" — doodles around a vintage twin-lens camera. 15 s loop.
import * as d from '../../lib/doodles.js';

export default {
  title: 'Say cheese!',
  duration: 15,
  photo: { file: 'photo.png', cx: 540, cy: 620, size: 620 },   // keyed cutout, drawn as a 620 px square

  build({ W, PI, TAU, INK, C, COLORS, clamp, easeOut, easeInOut, arc, circle, ellipse, line, quad, poly, roundRect,
          stroke, fill, shape, text, at, withAlpha, seq, add, photo }) {
    const GROUND = Math.round(photo.box.bottom) + 5;
    const LENS = [549, 697];                       // taking-lens centre (hand-placed on the photo)

    // ---- backdrop: draw-on staggered over the first ~2 s ----
    add(0, .9, d.ground({ y: GROUND }));
    add(.2, 1.2, d.rug({ y: GROUND }), 'back');
    add(.3, 1.2, d.mountains({
      pts: poly([40, GROUND], [150, 800], [230, 850], [340, 730], [430, 810], [540, 700], [660, 800], [760, 740], [860, 840], [930, 790], [W - 40, GROUND]),
      snow: [[[340, 730], [318, 762], [334, 756], [350, 770], [366, 758]], [[540, 700], [514, 736], [530, 730], [548, 744], [566, 730]]],
    }), 'back');
    add(.9, 1.2, d.sun({ x: 955, y: 262 }));
    [[150, 275, 1], [790, 335, .75]].forEach(([x, y, s], k) => add(1.3 + k * .3, 1, d.cloud({ x, y, s, phase: k * 2 })));
    add(1.6, 1.8, d.polaroidString());

    // ---- cat holding a "smile!" sign, bottom left ----
    add(2.4, 1.8, (t, r, f) => {
      const hop = -Math.abs(Math.sin(t * 4)) * 8;
      at(175, GROUND + hop, 0, 1, () => {
        const body = ellipse(0, -44, 36, 46, 24), head = circle(0, -118, 36, 28);
        const earL = poly([-30, -138], [-26, -176], [-6, -146]), earR = poly([30, -138], [26, -176], [6, -146]);
        const tail = quad([32, -22], [82, -30 + Math.sin(t * 3) * 14], [64, -92 + Math.sin(t * 3) * 10], 12);
        shape(body, C.orange, { fillAlpha: .4, fillIn: f, reveal: seq(0, 8, r) });
        stroke(tail, { width: 3.2, reveal: seq(1, 8, r) });
        stroke(line(-14, 2, -14, 12, 2), { width: 3, reveal: seq(1, 8, r) }); stroke(line(14, 2, 14, 12, 2), { width: 3, reveal: seq(1, 8, r) });
        shape(head, C.orange, { fillAlpha: .4, fillIn: f, reveal: seq(2, 8, r) });
        shape(earL, C.pink, { fillAlpha: .5, fillIn: f, width: 3, reveal: seq(3, 8, r) });
        shape(earR, C.pink, { fillAlpha: .5, fillIn: f, width: 3, reveal: seq(3, 8, r) });
        [-14, 0, 14].forEach(sx => stroke(line(sx, -150, sx * .8, -140, 2), { width: 2.6, reveal: seq(3, 8, r) }));   // tuft
        stroke(arc(-13, -120, 7, PI, TAU, 6), { width: 2.8, reveal: seq(4, 8, r) });                                   // happy eyes
        stroke(arc(13, -120, 7, PI, TAU, 6), { width: 2.8, reveal: seq(4, 8, r) });
        fill(poly([-4, -108], [4, -108], [0, -103]), C.pink, { alpha: .9, reveal: f });                                // nose
        stroke(arc(-5, -103, 5, 0, PI, 6), { width: 2.4, reveal: seq(5, 8, r) });                                      // mouth
        stroke(arc(5, -103, 5, 0, PI, 6), { width: 2.4, reveal: seq(5, 8, r) });
        [[-20, -110, -50, -114], [-20, -104, -50, -100], [20, -110, 50, -114], [20, -104, 50, -100]].forEach(l =>       // whiskers
          stroke(line(...l, 3), { width: 2.2, reveal: seq(5, 8, r) }));
        stroke(line(30, -72, 54, -122, 4), { width: 3.2, reveal: seq(6, 8, r) });                                      // arm + stick
        stroke(line(54, -122, 54, -206, 6), { width: 3.2, reveal: seq(6, 8, r) });
        at(54, -206, Math.sin(t * 4) * .03, 1, () => {
          shape(roundRect(-70, -76, 140, 76, 8), C.white, { fillAlpha: .85, fillIn: f, width: 3, reveal: seq(7, 8, r) });
          text('smile!', 0, -38, { size: 40, alpha: f });
        });
      });
    });

    // ---- bird posing, bottom right: blinks, bow tie, hearts float up ----
    const hearts = d.heartsRising({ x: 905, y: GROUND - 190 });
    add(3.0, 1.4, (t, r, f) => {
      const bob = Math.sin(t * 3) * 4;
      at(905, GROUND, Math.sin(t * 3) * .03, 1, () => {
        const body = ellipse(0, -52 + bob * .3, 34, 44, 24), head = circle(-6, -112 + bob, 24, 22);
        shape(body, C.blue, { fillIn: f, reveal: seq(0, 7, r) });
        stroke(arc(6, -50, 16, PI * 1.1, PI * 1.95, 10, 10), { width: 3, reveal: seq(1, 7, r) });                     // wing
        stroke(line(30, -60, 50, -76, 3), { reveal: seq(1, 7, r) }); stroke(line(30, -52, 52, -60, 3), { reveal: seq(1, 7, r) });   // tail
        stroke(line(-8, -10, -10, 0, 2), { width: 2.8, reveal: seq(2, 7, r) }); stroke(line(8, -10, 10, 0, 2), { width: 2.8, reveal: seq(2, 7, r) });   // legs
        stroke(line(-18, 0, -2, 0, 2), { width: 2.8, reveal: seq(2, 7, r) }); stroke(line(2, 0, 18, 0, 2), { width: 2.8, reveal: seq(2, 7, r) });      // feet
        shape(head, C.blue, { fillIn: f, reveal: seq(3, 7, r) });
        [[-12, -134, -20, -152], [-4, -136, -2, -156], [4, -134, 12, -150]].forEach(l => stroke(line(...l, 3), { width: 2.6, reveal: seq(3, 7, r) }));  // crest
        shape(poly([-28, -116 + bob], [-46, -110 + bob], [-28, -104 + bob]), C.orange, { fillAlpha: .85, fillIn: f, width: 2.6, reveal: seq(4, 7, r) }); // beak
        if ((t % 3.1) > 2.9) stroke(line(-18, -118 + bob, -10, -118 + bob, 2), { width: 2.6, reveal: seq(4, 7, r) });  // blink
        else fill(circle(-14, -118 + bob, 3.5, 8), INK, { alpha: .9, reveal: seq(4, 7, r) });
        shape(poly([-6, -86], [-22, -96], [-22, -76]), C.red, { fillAlpha: .8, fillIn: f, width: 2.4, reveal: seq(5, 7, r) });   // bow tie
        shape(poly([-6, -86], [10, -96], [10, -76]), C.red, { fillAlpha: .8, fillIn: f, width: 2.4, reveal: seq(5, 7, r) });
        stroke(circle(-6, -86, 3, 8), { close: true, width: 2.2, reveal: seq(6, 7, r) });
      });
      hearts(t, r, f);
    });

    // ---- ambient loops ----
    add(3.6, .9, d.paperPlane({ path: tt => { const a = -PI / 2 + tt * .55, w = 1 + .06 * Math.sin(tt * 2.3); return [540 + Math.cos(a) * 400 * w, 600 + Math.sin(a) * 290 * w]; } }));
    [[300, 380], [800, 250], [250, 580], [860, 600], [330, 820], [810, 760], [455, 280], [655, 270], [220, 460]]
      .forEach(([x, y], i) => add(4.0 + i * .1, .4, d.sparkle({ x, y, phase: i })));
    add(4.4, .6, d.confetti());

    // ---- shutter beats: flash + "click!", then a polaroid pops out of the top and flutters away ----
    [5.2, 8.4, 11.6].forEach((tc, k) => {
      add(tc, .001, d.flashBurst({ x: LENS[0], y: LENS[1] }));
      add(tc, .001, d.popText('click!', { x: 790, y: 660 }));
      add(tc + .25, .001, t => {
        const D = 2.6; if (t > D) return;
        const p = t / D, e = easeInOut(clamp(p * 1.25));
        const x = 540 + Math.sin(p * 7) * 34 * p, y = photo.box.top - 90 - e * 100, rot = Math.sin(p * 6) * .35, a = 1 - clamp((p - .7) / .3);
        withAlpha(a, () => at(x, y, rot, .6 + .4 * easeOut(clamp(t / .5)), () =>
          d.polaroid(COLORS[(k * 3 + 1) % 7], d.INNERS[(k + 2) % 4], 1, 1)));
      });
    });
  },
};
