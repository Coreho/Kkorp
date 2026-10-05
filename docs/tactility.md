# Tactility in the visible layer

The prototype was not short of decoration. It was short of **response in the
layer people actually read**. Every pointer-event site drove a background canvas:
the dotfield drift, the chat dot matrix, the panel scenes, the screensaver's
wake. Nothing a visitor can see and read reacted to the pointer, while the hover
rules were flat colour changes on 150-300ms transitions — so the chrome behaved
like a blander site than the one the canvases were performing.

This is the layer that closes that gap. It adds no dependency and no scroll.

| Piece | Where | Mechanism |
|---|---|---|
| Panel lean | `lib/useTactile.ts`, `.panel` | `rotateX`/`rotateY` under a stage `perspective`, plus an inner content offset |
| Magnetic controls | `lib/useTactile.ts`, `.cnav button`, `.bevel` | Displacement toward the pointer inside a radius, falling off to nothing |
| Nav pill travel | `lib/useTactile.ts`, `.cnav-pill` | One pill lerped between items, squashed by its own speed |
| Grain and vignette | `.film`, `.bevel` and `.aim-send` for press | Pure CSS: inline SVG turbulence plus a gradient |
| Staggered reveal | `.panel.open .inner > *` | `transition`/`animation` delays in milliseconds |

## One loop, time-based

Every movement is a **channel** on a single shared `requestAnimationFrame` loop
in `lib/tactile.ts`. A channel owns one scalar and is advanced by elapsed time:

```
value += (target - value) * (1 - exp(-dt / tau))
```

That is the correct discrete form of exponential smoothing, so the same
wall-clock time produces the same position at 60Hz and at 144Hz. Counting frames
would make the site run at two-and-a-half times the speed on a high-refresh
display. `tests/app/tactile.spec.js` asserts this by sampling the trajectory and
checking it against the closed-form curve, because a frame-counted
implementation passes every other test in the file.

Nothing goes through React state. A channel writes a CSS custom property on a DOM
node it already holds, so a 60fps movement never re-renders a component.

## Two CSS traps worth knowing

Both of these shipped as silent no-ops at one point in this work, and both were
caught only by measuring rendered output rather than by reading the code.

**A transform assigned through the CSSOM rejects `var()`.** React applies inline
styles through the CSSOM, so this computes to `none`:

```js
// Wrong. Silently dropped.
style={{ transform: 'translate3d(0,0,0) rotateX(var(--tilt-x, 0deg))' }}
```

The carousel therefore emits its geometry as custom properties and lets the
stylesheet compose the transform:

```css
.panel {
  transform: translate3d(var(--panel-x, 0px), 0, 0)
             scale(var(--panel-scale, 1))
             rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
}
```

**A unitless non-zero value is not an angle.** `rotateX(1.991)` is invalid at
computed-value time, which resolves the whole declaration to `none` and takes the
carousel down with the tilt. A unitless `0` *is* accepted, so the page looked
correct at rest and broke the instant the pointer moved. Every channel therefore
carries its unit, and the test asserts the computed transform is a `matrix3d`
rather than a translate or `none`.

## Why the transition is scoped

`.panel` keeps the carousel's 600ms `transform` transition, but only while the
stage is actually sliding:

```css
#panels[data-moving="true"] .panel { transition: transform .6s ...; }
```

Left on `.panel` unconditionally it would also apply to the tilt, which is
rewritten every frame, and the lean would arrive 600ms late and read as broken
rather than soft. `data-moving` is written straight to the node from an effect,
because it is a CSS hook with no bearing on what React renders.

## Reduced motion and coarse pointers

Both gate whether the effect is wired up **at all**, rather than filtering its
results, so nothing is even observed:

- **Reduced motion**: no listeners, no loop, no inline custom properties. The
  stylesheet's reduced-motion rules apply, and the staggered reveal does not run.
  The nav pill still follows the section change, because that is navigation state
  rather than decoration — it arrives instead of travelling.
- **Coarse pointer**: the same, via `(pointer: fine)`. Keyboard-only visitors get
  a completely static, fully operable site.

Grain and vignette stay in both cases: a still texture is not motion.

## Contrast

The grain layer is `mix-blend-mode: overlay` at `opacity: .05`. Overlay with
mid-grey noise is close to a no-op on mid-tones, so measured text contrast is
left alone. This is verified rather than asserted: the test walks up from each
text sample to the first opaque background, then runs the **real** composite in a
canvas and recomputes the WCAG ratio, for both the dark glass panel and the light
chat window, which is the one place with dark text on a light face. The worst
case the noise can produce must not drop any ratio by half a point.

## Verifying

```bash
npm run build
npm run test:app                       # 12 tactile tests + 12 existing
node scripts/tactile-evidence.mjs after  # screenshots + perf, needs the app on :4180
```

`scripts/tactile-evidence.mjs` captures the landing, all four panels, an engaged
nav hover and an engaged panel tilt at 1280px and 390px, plus a
`PerformanceObserver` long-task reading and the client JS totals. Run it with
`before` and `after` labels to compare; `docs/evidence/` holds both.

Each test was checked against a real mutation rather than trusted:

| Mutation | Result |
|---|---|
| Drop the CSS units from the channel values | caught |
| Drop the rotations from the carousel transform | caught |
| `MAGNET_PULL = 0` | caught |
| `PILL_TAU = 0.001`, so the pill teleports | caught |
| Remove the `(pointer: fine)` gate | caught |
| Remove the reduced-motion gate | caught |

## Known limitations

- The peeking neighbours only lean when the pointer is within 40px of them, so
  the "lean away" read is subtle rather than constant. Making it constant would
  mean movement with no pointer cause, which AC#2 rules out.
- `perspective: 1700px` on the stage puts the panel contents in a 3D rendering
  context. Measured cost was within the run-to-run noise of the pre-change
  baseline (longest task 63ms against 71ms before), but it is the first thing to
  revisit if the canvas engines ever get heavier.
- `.action` and `.close` are `display: none !important` in the ported stylesheet,
  as they are in the prototype, so the press feedback is not applied to them.
- The stage is measured for carousel geometry while `stage-off` still applies
  `transform: scale(.96)`, so the carousel is sized from a stage 4% narrower than
  it ends up. This is faithful to the prototype, which has the same behaviour
  because it also measures synchronously after removing the class. Left alone on
  purpose.
