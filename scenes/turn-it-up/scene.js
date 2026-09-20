// "Turn it up!" — a boombox pounds out six beats and the doodles bounce to it. 7.2 s.
import * as d from '../../lib/doodles.js';

export default {
  title: 'Turn it up!',
  duration: 7.2,
  photo: { file: 'photo.png', cx: 540, cy: 692, size: 900 },   // 1024² padded cutout, boombox ≈ 720 px wide

  build({ W, H, PI, TAU, INK, C, COLORS, clamp, lerp, easeOut, easeInOut, rng, arc, circle, ellipse, line, quad, poly, star4, roundRect,
          stroke, fill, shape, text, at, withAlpha, seq, add, photo }) {
    const BEAT = .75, BEATS = Array.from({ length: 6 }, (_, i) => 2.2 + i * BEAT);   // 2.2 … 5.95
    const MAX = BEATS[0] + 6 * BEAT, SETTLE = .4;                                     // 6.7; all MAX one-shots dead by 7.1
    const B = photo.box, GROUND = Math.round(B.bottom) + 5;
    const CX = photo.cx, CY = (B.top + B.bottom) / 2;
    const SPK = [[296, 746, 101], [795, 744, 94]];   // big speaker cones: centre + rim radius (hand-placed on the photo)
    const DIAL = [670, 588];                          // volume knob
    const CLICKS = [1.95, 2.05, 2.15];
    const addT = (t0, dur, fn, layer) => add(t0, dur, (t, r, f) => fn(t + t0, r, f, t), layer);   // fn(T global, r, f, t local)

    // ---- the one pulse everything reads: px of downward sag after each beat, 0 at rest ----
    const PULSES = [...BEATS.map(b => [b, 1]), [MAX, 2.2]];
    const bounce = T => {
      let y = 0;
      for (const [tb, k] of PULSES) { const u = T - tb; if (u >= 0) y += k * 14 * Math.sin(u * TAU * 3) * Math.exp(-u * 6); }
      return y * (1 - clamp((T - (MAX + .2)) / .2));
    };
    const beatsSoFar = T => BEATS.filter(b => b <= T).length;
    const pose = T => { const n = beatsSoFar(T); if (!n) return 0; const k = easeOut(clamp((T - BEATS[n - 1]) / .2)); return n % 2 ? k : 1 - k; };
    const jump = T => -90 * Math.sin(PI * clamp((T - MAX) / SETTLE));
    const hatFly = T => { const u = clamp((T - MAX) / SETTLE); return [-170 * Math.sin(PI * u), TAU * easeInOut(u)]; };

    // ---- backdrop: stock doodles, wrapped so they ride the pulse ----
    const g = d.ground({ y: GROUND }), sun = d.sun({ x: 930, y: 230 });
    const clouds = [d.cloud({ x: 150, y: 250 }), d.cloud({ x: 760, y: 300, s: .75, phase: 2 })];
    addT(0, .8, (T, r, f, t) => at(0, bounce(T) * .5, 0, 1, () => g(t, r, f)));
    addT(.2, 1, (T, r, f, t) => at(0, bounce(T) * .6, 0, 1, () => sun(t, r, f)), 'back');
    clouds.forEach((c, k) => addT(.5 + k * .3, 1, (T, r, f, t) => at(0, bounce(T) * .4, 0, 1, () => c(t, r, f)), 'back'));

    // ---- cat, left of the box: two dance poses blended by q, party hat ----
    addT(.9, 1.3, (T, r, f, t) => {
      const q = pose(T), [hy, hrot] = hatFly(T);
      at(B.left - 95, GROUND + bounce(T) + jump(T), lerp(-.1, .1, q) - bounce(T) * .006, 1, () => {
        const hx = lerp(-6, 6, q);
        const body = ellipse(0, -44, 36, 46, 24), head = circle(hx, -118, 36, 28);
        const earL = poly([hx - 30, -138], [hx - 26, -176], [hx - 6, -146]), earR = poly([hx + 30, -138], [hx + 26, -176], [hx + 6, -146]);
        const tail = quad([32, -22], [82, -30 + Math.sin(t * 3) * 14], [64, -92 + Math.sin(t * 3) * 10 - q * 30], 12);
        shape(body, C.orange, { fillAlpha: .4, fillIn: f, reveal: seq(0, 8, r) });
        stroke(tail, { width: 3.2, reveal: seq(1, 8, r) });
        stroke(line(-14, 2, -14, 12, 2), { width: 3, reveal: seq(1, 8, r) }); stroke(line(14, 2, 14, 12, 2), { width: 3, reveal: seq(1, 8, r) });
        shape(head, C.orange, { fillAlpha: .4, fillIn: f, reveal: seq(2, 8, r) });
        shape(earL, C.pink, { fillAlpha: .5, fillIn: f, width: 3, reveal: seq(3, 8, r) });
        shape(earR, C.pink, { fillAlpha: .5, fillIn: f, width: 3, reveal: seq(3, 8, r) });
        stroke(arc(hx - 13, -120, 7, PI, TAU, 6), { width: 2.8, reveal: seq(4, 8, r) });                                   // happy eyes
        stroke(arc(hx + 13, -120, 7, PI, TAU, 6), { width: 2.8, reveal: seq(4, 8, r) });
        fill(poly([hx - 4, -108], [hx + 4, -108], [hx, -103]), C.pink, { alpha: .9, reveal: f });                          // nose
        stroke(arc(hx, -100, 9, 0, PI, 8), { width: 2.4, reveal: seq(5, 8, r) });                                          // open grin
        [[-20, -110, -50, -114], [-20, -104, -50, -100], [20, -110, 50, -114], [20, -104, 50, -100]].forEach(l =>          // whiskers
          stroke(line(l[0] + hx, l[1], l[2] + hx, l[3], 3), { width: 2.2, reveal: seq(5, 8, r) }));
        const aL = [lerp(-58, -54, q), lerp(-30, -128, q)], aR = [lerp(54, 58, q), lerp(-128, -30, q)];                    // arms alternate up/down
        stroke(quad([-30, -70], [lerp(-62, -70, q), -80], aL, 8), { width: 3.4, reveal: seq(6, 8, r) });
        stroke(quad([30, -70], [lerp(70, 62, q), -80], aR, 8), { width: 3.4, reveal: seq(6, 8, r) });
        at(hx, -172 + hy, hrot, 1, () => {                                                                                 // party cone, flips off at MAX
          shape(poly([-22, 22], [22, 22], [0, -32]), C.yellow, { fillAlpha: .7, fillIn: f, width: 3, reveal: seq(7, 8, r) });
          stroke(line(-11, -4, 11, -4, 3), { color: C.red, width: 3, reveal: seq(7, 8, r) });
          shape(circle(0, -34, 6, 10), C.red, { fillAlpha: .9, fillIn: f, width: 2.2, reveal: seq(7, 8, r) });
        });
      });
    });

    // ---- bird, right of the box: wing pumps, top hat ----
    addT(1.15, 1.3, (T, r, f, t) => {
      const q = pose(T), [hy, hrot] = hatFly(T), bob = Math.sin(t * 3) * 4;
      at(B.right + 95, GROUND + bounce(T) + jump(T), lerp(.1, -.1, q) - bounce(T) * .006, 1, () => {
        const body = ellipse(0, -52 + bob * .3, 34, 44, 24), head = circle(-6, -112 + bob, 24, 22);
        shape(body, C.blue, { fillIn: f, reveal: seq(0, 7, r) });
        const wa = lerp(PI * 1.1, PI * 1.55, q);                                                                            // wing pumps up on the beat
        stroke(arc(6, -50, 16, wa, wa + PI * .85, 10, 10), { width: 3, reveal: seq(1, 7, r) });
        stroke(line(30, -60, 50, -76, 3), { reveal: seq(1, 7, r) }); stroke(line(30, -52, 52, -60, 3), { reveal: seq(1, 7, r) });   // tail
        stroke(line(-8, -10, -10, 0, 2), { width: 2.8, reveal: seq(2, 7, r) }); stroke(line(8, -10, 10, 0, 2), { width: 2.8, reveal: seq(2, 7, r) });
        stroke(line(-18, 0, -2, 0, 2), { width: 2.8, reveal: seq(2, 7, r) }); stroke(line(2, 0, 18, 0, 2), { width: 2.8, reveal: seq(2, 7, r) });
        shape(head, C.blue, { fillIn: f, reveal: seq(3, 7, r) });
        shape(poly([-28, -116 + bob], [-46, -110 + bob], [-28, -104 + bob]), C.orange, { fillAlpha: .85, fillIn: f, width: 2.6, reveal: seq(4, 7, r) });
        if ((t % 3.1) > 2.9) stroke(line(-18, -118 + bob, -10, -118 + bob, 2), { width: 2.6, reveal: seq(4, 7, r) });      // blink (1 call either way)
        else fill(circle(-14, -118 + bob, 3.5, 8), INK, { alpha: .9, reveal: seq(4, 7, r) });
        shape(poly([-6, -86], [-22, -96], [-22, -76]), C.red, { fillAlpha: .8, fillIn: f, width: 2.4, reveal: seq(5, 7, r) });   // bow tie
        shape(poly([-6, -86], [10, -96], [10, -76]), C.red, { fillAlpha: .8, fillIn: f, width: 2.4, reveal: seq(5, 7, r) });
        stroke(circle(-6, -86, 3, 8), { close: true, width: 2.2, reveal: seq(6, 7, r) });
        at(-6, -150 + bob + hy, hrot, 1, () => {                                                                           // top hat
          shape(roundRect(-30, 8, 60, 8, 3), INK, { fillAlpha: .8, fillIn: f, width: 2.6, reveal: seq(6, 7, r) });
          shape(roundRect(-19, -26, 38, 34, 3), INK, { fillAlpha: .8, fillIn: f, width: 2.6, reveal: seq(6, 7, r) });
          stroke(line(-19, 0, 19, 0, 3), { color: C.red, width: 4, reveal: seq(6, 7, r) });
        });
      });
    });

    // ---- hand reaches in from the right, ratchets the volume knob three times, leaves an ink pointer turned up ----
    addT(1.5, .35, (T, r) => {
      const reach = easeInOut(clamp((T - 1.5) / .4)), back = easeInOut(clamp((T - 2.25) / .35)), ext = reach - back;
      const twist = CLICKS.reduce((s, c) => s + easeOut(clamp((T - c) / .08)) * .4, 0) + easeOut(clamp((T - MAX) / .15)) * .7;
      const hx = lerp(W + 140, DIAL[0] + 6, ext), hy = lerp(DIAL[1] - 220, DIAL[1] - 4, ext);
      withAlpha(1 - clamp((T - 2.5) / .1), () => {
        stroke(quad([W + 60, hy - 240], [hx + 110, hy - 110], [hx + 26, hy - 14], 10), { width: 6, reveal: r });           // forearm from top right
        at(hx, hy, twist * .5, 1, () => {
          shape(ellipse(14, 12, 30, 22, 20), C.pink, { fillAlpha: .35, width: 3.4, reveal: r });                            // palm
          stroke(quad([-8, 4], [-22, -14], [-6, -22], 6), { width: 3.4, reveal: r });                                       // thumb
          stroke(quad([12, -8], [4, -26], [-2, -20], 6), { width: 3.2, reveal: r });                                        // index
          stroke(quad([26, -6], [22, -26], [14, -20], 6), { width: 3.2, reveal: r });                                       // middle
        });
      });
      stroke(line(DIAL[0], DIAL[1], DIAL[0] + Math.cos(-PI * .75 + twist) * 24, DIAL[1] + Math.sin(-PI * .75 + twist) * 24, 3),
        { color: C.red, width: 5, alpha: clamp((T - 1.9) / .1) });                                                         // knob pointer stays
    });
    CLICKS.forEach((c, i) => add(c, .001, d.popText('click', { x: DIAL[0] + 40 + i * 44, y: DIAL[1] - 120 - i * 30, size: 30 + i * 5, life: .5, rot: -.2 + i * .1 })));

    // ---- speaker rings: 12 beat arcs + 1 giant MAX ring, all drawn every frame (dead = alpha 0, keeps seeds stable) ----
    const RING_LIFE = .6;
    addT(BEATS[0], .001, T => {
      BEATS.forEach((tb, i) => SPK.forEach(([x, y, r0], s) => [0, .09].forEach((lag, k) => {
        const u = T - tb - lag, p = clamp(u / RING_LIFE), alive = u >= 0 && u < RING_LIFE;
        const a0 = s ? -PI * .4 : PI * .6;
        stroke(arc(x, y, r0 + easeOut(p) * (200 - k * 60), a0, a0 + PI * .8, 18),
          { color: COLORS[i % COLORS.length], width: (13 - k * 4) - 8 * p, alpha: alive ? .9 * (1 - p) : 0, jitter: 2.5 });
      })));
      const u = T - MAX, p = clamp(u / SETTLE);
      stroke(circle(CX, CY, 140 + easeOut(p) * 620, 40), { color: C.yellow, width: 16 - 12 * p, alpha: u >= 0 && u < SETTLE ? .9 * (1 - p) : 0, jitter: 3 });
      stroke(circle(CX, CY, 100 + easeOut(p) * 560, 40), { color: C.red, width: 8 - 6 * p, alpha: u >= 0 && u < SETTLE ? .8 * (1 - p) : 0, jitter: 3 });
    });

    // ---- equalizer bars above the box: idle stubs that leap on every beat ----
    const level = T => { let l = 0; for (const [tb, k] of PULSES) { const u = T - tb; if (u >= 0) l += k * Math.exp(-u * 4); } return l * (1 - clamp((T - (MAX + .2)) / .2)); };
    const BARS = 9, BW = 26, BG = 12, BX0 = CX - (BARS * BW + (BARS - 1) * BG) / 2;
    addT(1.3, .5, (T, r, f) => {
      const l = level(T);
      for (let i = 0; i < BARS; i++) {
        const h = 14 + Math.min(l, 1.5) * (50 + 80 * Math.abs(Math.sin(i * 1.7 + T * 9))), x = BX0 + i * (BW + BG);
        shape(roundRect(x, B.top - 22 - h, BW, h, 5), COLORS[i % COLORS.length], { fillAlpha: .7, fillIn: f, width: 3, reveal: seq(i, BARS, r) });
      }
    });

    // ---- thump marks: dashes flick off the box edges on every beat (the photo itself can't move) ----
    addT(BEATS[0], .001, T => {
      PULSES.forEach(([tb, k]) => {
        const u = T - tb, p = clamp(u / .25), e = easeOut(p) * k, a = u >= 0 && u < .25 ? 1 - p : 0;
        [-1, 1].forEach(dir => [CY - 90, CY, CY + 90].forEach(yy => {
          const x = (dir < 0 ? B.left : B.right) + dir * (12 + e * 28);
          stroke(line(x, yy - 18, x, yy + 18, 3), { width: 5.5, alpha: a });
        }));
        [[B.left + 50, -1], [B.right - 50, 1]].forEach(([x, dir]) => {
          const x0 = x + dir * (8 + e * 22), y0 = B.top - 10 - e * 22;
          stroke(line(x0, y0, x0 + dir * 24, y0 - 24, 3), { width: 5.5, alpha: a });
        });
      });
    });

    // ---- music notes: 2 per beat, one from each speaker, float up and pop ----
    const NOTE_LIFE = 1.1;
    addT(BEATS[0], .001, T => {
      BEATS.forEach((tb, i) => SPK.forEach(([x, y, r0], s) => {
        const u = T - tb, p = clamp(u / NOTE_LIFE), alive = u >= 0 && u < NOTE_LIFE, dir = s ? 1 : -1, e = easeOut(p);
        const col = COLORS[(i * 2 + s) % COLORS.length];
        const nx = x + dir * (r0 + 24 + e * 80 + Math.sin(u * 5 + i) * 18), ny = y - 40 - e * 380;
        const sc = 1.5 * easeOut(clamp(u / .15)) * (1 + .08 * Math.sin(u * 8)), q = clamp((u - NOTE_LIFE + .25) / .25);
        withAlpha(alive ? 1 - clamp((p - .7) / .3) : 0, () => at(nx, ny, -.2 + Math.sin(u * 4 + s) * .15, sc, () => {
          shape(ellipse(0, 0, 11, 8, 12), col, { fillAlpha: .8, width: 3 });
          stroke(line(9, -2, 9, -40, 4), { width: 3.2 });
          stroke(quad([9, -40], [28, -30], [20, -8], 8), { width: 3.2, color: col });
        }));
        withAlpha(alive && q > 0 ? 1 - q : 0, () => at(nx, ny, q * 2, .5 + q, () => stroke(star4(16), { color: col, width: 2.6 })));
      }));
    });

    // ---- MAX!: dial to 11, big text, confetti burst (hats + jump + giant ring live in the elements above) ----
    add(MAX, .001, d.popText('MAX!', { x: CX, y: 150, size: 120, life: SETTLE, rot: -.08 }));
    add(MAX, .001, d.popText('11', { x: DIAL[0] + 46, y: DIAL[1] - 54, size: 46, color: C.red, life: SETTLE, rot: .15 }));
    const CONF = Array.from({ length: 18 }, (_, i) => { const R = rng(31 + i); return [-PI * .95 + R() * PI * .9, .55 + R() * .45, R() * TAU, i % COLORS.length]; });
    addT(MAX, .001, T => {
      const u = T - MAX, life = .42, p = clamp(u / life), alive = u >= 0 && u < life;
      CONF.forEach(([a, v, rot, ci]) => {
        const px = CX + Math.cos(a) * v * p * 760, py = B.top - 40 + Math.sin(a) * v * p * 700 + 700 * p * p;
        withAlpha(alive ? 1 - p * p : 0, () => at(px, py, rot + p * 6, 1, () => shape(roundRect(-14, -8, 28, 16, 3), COLORS[ci], { fillAlpha: .8, width: 2.6 })));
      });
    });

  },
};
