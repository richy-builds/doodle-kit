# Doodle kit

Hand-drawn doodles animated around a photo, rendered to a 1080×1080 mp4. Canvas 2D,
no build step; headless Chromium + ffmpeg for the video.

```
lib/engine.js     the sketch engine (strokes, fills, boil, reveal, timeline, photo, render)
lib/doodles.js    stock doodles: ground, rug, mountains, sun, cloud, polaroids, hearts, plane, sparkle, confetti, flash, popText
lib/page.html     preview + capture page, ?scene=<name>
scenes/<name>/    scene.js + photo.png + ATTRIBUTION.md   (scenes/template is the copy-me starting point)
tools/            render.mjs · serve.mjs · key-checkerboard.mjs
out/<name>/       renders (gitignored)
```

## Make a new animation

1. `cp -r scenes/template scenes/<name>` and edit `title`, `duration`.
2. Find a CC0 cutout on a plain background (Openverse: `https://api.openverse.org/v1/images/?q=<subject>&license=cc0&size=large`).
   If the download has a baked-in checkerboard: `npm run key -- in.jpg scenes/<name>/photo.png`. Note the source in `ATTRIBUTION.md`.
3. Set `photo: { file: 'photo.png', cx, cy, size }` (drawn as a `size` px square centred at cx, cy).
   `photo.box` (top/bottom/left/right of the opaque pixels) is available inside `build`, so anchor the ground, string, etc. to it.
4. Write `build(k)`: stock backdrop first, then one or two characters that react to the subject, then ambient loops, then a beat on a timer.
5. Iterate with `npm run preview -- <name>` (scrub, space, ← →, `&t=5.2` opens paused there) and `npm run sheet -- <name>`.
6. `npm run render -- <name>` → `out/<name>/<name>.mp4`.

## Scripts (all take the scene name after `--`)

| script | output |
|---|---|
| `npm run preview -- <name>` | serves the repo on :8321 and opens the preview page |
| `npm run frame -- <name> 5.2` | `out/<name>/t5.20.png`, one moment |
| `npm run stills -- <name>` / `sheet` | 6 stills across the loop / tiled contact sheet |
| `npm run motion -- <name>` | 30 moments overlaid: shows every loop's path at a glance |
| `npm run render -- <name>` | 30 fps H.264, `out/<name>/<name>.mp4` |
| `npm run key -- in.jpg out.png` | strip a baked checkerboard into real alpha |

Browser: `$BROWSER_PATH`, else Playwright's cached Chromium, else installed Chrome.

## Engine API (`build(k)` receives all of these; `lib/doodles.js` imports them)

- **Geometry → polylines**: `arc(cx,cy,r,a0,a1,n,ry)` `circle` `ellipse` `line(x0,y0,x1,y1,n)` `quad(p0,p1,p2)` `poly(...pts)` `heart(s)` `star4(r)` `roundRect(x,y,w,h,r)`
- `stroke(pts, { color, width=3.4, alpha, jitter=1.5, reveal, close, dash, seed })` — double-drawn sketchy line, revealed by prefix
- `fill(pts, color, { alpha=.45, reveal, seed })` — two offset translucent passes, marker-style
- `shape(pts, color, { fillIn, fillAlpha, ...strokeOpts })` — closed outline + fill in one call
- `text(str, x, y, { size, color, alpha })` — hand-lettered font, slight wobble
- `at(x, y, rot, scale, fn)` `withAlpha(a, fn)` — transform / fade a group
- `seq(i, n, r)` — reveal of the i-th of n strokes when the element is `r` revealed
- `add(t0, dur, draw(t, r, f), layer='front'|'back')` — element on the timeline: `t` local seconds, `r` outline reveal 0→1 over `dur`, `f` fill-in 0→1 over the following .4 s. `'back'` draws behind the photo.
- `photo.box`, `W`, `H`, `C` (pastel palette), `COLORS`, `INK`, `clamp` `lerp` `easeOut` `easeInOut` `rng(seed)`

**Seeds are automatic.** Each stroke/fill/text call takes the next seed for its element, reset every frame, so
jitter is stable across frames without bookkeeping. Pass `seed:` only to pin something deliberately. If a branch
changes *how many* calls an element makes, later strokes in that element re-jitter on those frames; under the
8 Hz boil that is invisible, but keep both branches of a conditional making the same number of calls when easy.

## What makes it look right

1. **Double-drawn ink**: every line twice with different jitter, round caps, dark-brown ink (`INK`).
2. **Boil**: jitter re-seeds 8×/s, so static lines shimmer like frame-by-frame animation.
3. **Staggered draw-on**: elements reveal in order over the first ~5 s (each ~1–2 s), then soft fills fade in.
4. **Marker fills**: translucent colour polygons a few px off the outline.
5. **Loops that resolve**: bounces, blinks, drifting, floating-up-and-fading, all periodic; beats on a fixed
   schedule; pick periods so the clip ends cleanly at `duration`. Keep the photo clear except deliberate touches.

## QA before posting

`sheet` (composition and draw-on order) → `motion` (loop paths, nothing crossing the subject by accident) →
`render` → `ffprobe out/<name>/<name>.mp4` (1080×1080, 30 fps, h264 yuv420p) → watch it once at full size.
