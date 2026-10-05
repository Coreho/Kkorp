---
id: TASK-015
title: Add tactility and depth to the visible layer
status: In Progress
assignee:
  - '@codex'
created_date: '2026-10-04 03:29'
updated_date: '2026-10-05 09:38'
labels:
  - design
  - frontend
  - animation
  - accessibility
milestone: m-0
dependencies:
  - TASK-016
priority: high
type: enhancement
ordinal: 1050
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rewritten after measuring the site rather than reading the original wishlist. The original text is preserved in draft-009 together with the reasoning below.

## Why this was rewritten

The original proposed Three.js and React Three Fiber backgrounds, GSAP ScrollTrigger scrollytelling, framer-motion layoutId morphing and spring physics, a custom cursor, text-distortion shaders, grain, and variable fonts. Most of it cannot be built on this site as described.

**The scrollytelling half is inoperative.** The site has no document scroll. `html, body { overflow: hidden }`, `main#panels` is `position: fixed; top: 84px; bottom: 84px`, and every panel is absolutely positioned inside it. Measured on the running site: `scrollHeight === innerHeight`, `canScroll: false`, and a 3000px wheel leaves `window.scrollY === 0`. ScrollTrigger and `useScroll` both read scroll progress, so pinning, timeline scrubbing, scroll-linked 3D rotation and multi-layer parallax all bind to a value that is permanently zero. Delivering them means first rebuilding the layout to be scrollable, which means dismantling the carousel that is the site.

**framer-motion conflicts with the carousel.** Panel geometry is computed in `useCarouselLayout` and applied as `transform` and `width` props. framer-motion owns transforms, and `layoutId` assumes navigation between routes, whereas the panels are siblings in one fixed stage.

**The mandated stack contradicts the approved architecture.** docs/production-architecture.md commits to a plain stylesheet ported from the prototype and hand-written canvas engines, and the app now ships that. Adding GSAP, framer-motion and React Three Fiber replaces the animation layer rather than extending it. The site already runs five or more canvas surfaces at 576 KB of client JS on one modest VPS with no CDN, against a Lighthouse 85 floor. A custom cursor was dropped too: it collides with the screensaver's existing `cursor: none` and adds a keyboard-only failure mode.

## What "bland" actually is here

The site is not short of decoration. It is short of **response in the visible layer**.

All nine pointer-event sites in the prototype drive background canvases: the dotfield drift, the chat dot matrix, the panel scenes, the screensaver's wake, the Konami handler. Nothing that a visitor can see and read reacts to them. Meanwhile the seven hover rules are flat colour changes or 2px nudges on 150-300ms transitions, while the site already demonstrates genuine spring physics in the jelly logo. The chrome and content therefore behave like a different, blander site than the one the canvases are performing.

So this task adds tactility and depth to the layer people actually look at, in the site's own material rather than a generic one: glass that leans, controls with weight, a surface with grain, and motion that respects reduced-motion instead of ignoring it.

## Scope

1. **Magnetic controls.** The section nav and the primary in-panel buttons drift toward the pointer inside a small radius and settle back when it leaves, using the existing `--ease`. Native pointer tracking only.
2. **Panel parallax.** The current glass panel leans a few degrees toward the pointer and its inner content offsets slightly, so the panel reads as a physical object with depth. Peeking neighbours lean away.
3. **Grain and vignette.** One low-opacity noise texture over the whole viewport at `mix-blend-mode: overlay`, plus a soft vignette. Pure CSS, no script.
4. **Nav pill travel.** The active pill slides between items with a weighted curve and squashes slightly in transit, so switching sections has follow-through rather than an instant jump.
5. **Press feedback.** Buttons depress with a small scale and a collapsing shadow, then release with overshoot.
6. **Staggered reveal.** Panel content enters in a short sequence when a slide opens, reusing `--ease`, driven by time rather than by layout thrash.
7. **Make reduced motion real.** The canvas engines hard-code `const reduce = false`, so the `prefers-reduced-motion` block only affects CSS. Continuous animation must actually stop and transitions must collapse, while every control stays fully usable.

## Constraints

No new runtime dependencies. Nothing that assumes a scrollbar. No change to layout geometry, colours, radii or the 4px spacing rhythm. Every added listener and timer must clean up on unmount, per AGENTS.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 No new runtime dependency is added: three, @react-three/fiber, drei, gsap, framer-motion and lenis are absent from package.json, and total client JavaScript for the built application does not exceed 620 KB.
- [x] #2 Magnetic attraction and panel tilt are pointer-only: with a coarse pointer, no fine pointer, or keyboard-only navigation, nothing moves, and the site is fully operable.
- [x] #3 prefers-reduced-motion: reduce stops continuous canvas animation and collapses added transitions, and every control remains reachable and usable. The hard-coded reduce flag in the canvas engines is removed rather than left false.
- [x] #4 All interactive elements remain keyboard reachable with a visible focus indicator, and the section nav and all four panels can be operated without a pointer.
- [x] #5 At 390px there is no horizontal overflow, and tilt or magnetic movement cannot push any content outside its panel or cause a scrollbar.
- [x] #6 Text contrast and the committed palette are unchanged; grain opacity stays low enough that body text keeps its existing measured contrast ratio.
- [x] #7 Added pointer and animation work is time-based rather than frame-count based, so behaviour does not change with refresh rate.
- [x] #8 Before and after screenshots are attached at 1280px and 390px, and a measurement records the client JavaScript total and the longest task in the main thread so the performance cost is visible rather than asserted.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [x] #2 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
- [ ] #3 The wow factor is judged by the owner against before and after screenshots at both widths, not by a checkbox.
- [x] #4 Reduced-motion and keyboard-only paths are verified by test, not assumed.
- [x] #5 Acceptance criteria are verified with recorded evidence.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Capture the before evidence before touching anything: screenshots of the landing, all four panels, an engaged nav hover and an engaged panel hover at 1280px and 390px, plus the PerformanceObserver long-task numbers and the client JS totals. Baseline is recorded: longest task 71ms at 1280px and 58ms at 390px, zero console errors. AC#8 needs the same run again afterwards, and a cost that was never measured cannot be shown to be small. scripts/tactile-evidence.mjs does the capture so both runs are identical.\n2. Decide where the motion budget goes. Only three of the seven scope items need script: magnetic controls, panel tilt and nav pill travel. Grain and vignette, press feedback and the staggered reveal are pure CSS, which is also the cheapest and safest option. So exactly one requestAnimationFrame loop is added, shared by all three, and it writes CSS custom properties straight to DOM nodes. Nothing in it goes through React state, because a 60fps setState would re-render the whole site per frame and wreck the long-task baseline captured in step 1.\n3. Build lib/tactile.ts as one driver with a registry of spring-ish channels rather than three separate loops. Each channel holds a current value, a target and a velocity, is advanced by elapsed time rather than by frame count so behaviour is identical at 60Hz and 144Hz per AC#7, and is written to a custom property. It exposes start and stop, and stop cancels the frame request and removes every listener it added, because AGENTS.md requires cleanup and the prototype's uncancellable loops are the defect being avoided.\n4. Gate all of it on a fine pointer. One matchMedia('(pointer: fine)') test decides whether any listener is attached at all, so with a coarse pointer, no fine pointer, or keyboard-only navigation nothing moves and nothing is observed, which is what AC#2 requires. The gate is re-evaluated on change so a hybrid laptop switching to touch-only stops moving.\n5. Compose panel tilt with the carousel rather than fighting it. The carousel already owns .panel's transform as a React prop, and .panel has a 0.6s transform transition that smooths slide changes, so a tilt written to the same property would arrive 600ms late and feel broken. Instead panelLayoutFor appends rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) to the existing translate3d and scale, which compose cleanly and default to no rotation, and the long transition is scoped to a data-moving attribute that is present only while the carousel is actually sliding. Tilt then tracks the pointer 1:1 with no transition, and slide changes keep their 600ms ease. The transform-origin is already per-state, so a left peeking neighbour pivots on its right edge and leans away from the pointer, which is the behaviour the scope asks for.\n6. Nav pill travel. The active item already paints its own gradient via aria-current, which the repository check and the browser suite both pin, so aria-current stays exactly as it is and only the painting moves: a single .cnav-pill element is lerped toward the active item's measured rect, squashing on the X axis in proportion to its own travel speed so it decelerates visibly instead of snapping. Buttons keep their hit areas and focus rings untouched.\n7. Magnetic controls. Within a small radius of a nav or primary button, translate it toward the pointer by a fraction of the offset and let it settle back on leave, eased with the existing --ease. Only transform changes, so nothing reflows, and the pull is capped well under the 4px spacing rhythm so no layout geometry moves.\n8. Grain and vignette, pure CSS and no script: one fixed full-viewport overlay carrying an inline SVG feTurbulence data URI at mix-blend-mode overlay, plus a radial-gradient vignette. pointer-events none, aria-hidden, and low enough opacity that body text keeps its measured contrast, which AC#6 requires. No network request, no canvas, no extra paint loop.\n9. Press feedback and staggered reveal, both pure CSS. Buttons depress on :active with a small scale and a collapsing shadow, then release on an overshoot curve. Panel content enters on open using transition-delay stepping through the panel's children with --ease and millisecond delays, so the sequence is time-based like everything else rather than frame-counted.\n10. Finish reduced motion, which scope item 7 and AC#3 both demand. lib/canvas/motion.ts already replaced the prototype's hard-coded reduce = false, so that half is done and must be verified rather than rewritten. What is missing is the CSS side for everything added here: under prefers-reduced-motion the tilt and magnetism channels must never start, the pill must jump instead of travel, grain and vignette stay, since a static texture is not motion, and the new transitions collapse to none. Every control must remain reachable and usable with the preference set.\n11. Regression coverage per acceptance criterion, not one smoke test. Coarse pointer and reduced motion each get a Playwright context assertion that nothing moved and everything still works; keyboard-only navigation is asserted end to end; 390px is asserted to have zero horizontal overflow with tilt engaged; contrast is asserted by sampling computed colour against the measured ratio; and the tactile module's own time-based stepping is unit-checkable by driving it with an injected clock. The existing 3 prototype and 12 application tests must not change behaviour.\n12. Re-run the evidence capture with the after label, diff the numbers against step 1, and hand the screenshots to the owner. DoD#3 is the owner's judgement of the wow factor against before and after at both widths, so the task does not go to Done on my say-so. If the long-task figure or the JS total regresses, that is reported plainly rather than explained away.

9. Corrected while implementing. The carousel transform cannot be composed in JS at all: React applies inline styles through the CSSOM, and a transform assigned that way silently rejects var(), so panelLayoutFor now emits --panel-x and --panel-scale and the stylesheet composes the transform. Every channel also carries its CSS unit, because a unitless non-zero angle makes the whole declaration invalid at computed-value time and resolves it to none, which takes the carousel down with the tilt; a unitless 0 is accepted, so this only ever broke once the pointer moved. main#panels also gained perspective: 1700px, because a rotateY with no perspective is symmetric about the centre and reads as the panel getting narrower rather than as depth.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
All eight acceptance criteria verified, twelve new tests, and two silent no-op defects found that a code reading would have shipped. The panel lean is composed in the stylesheet, not in JS. React applies inline styles through the CSSOM, and a transform assigned that way rejects var(): style={{transform: '... rotateX(var(--tilt-x, 0deg))'}} computes to none, taking the carousel with it. panelLayoutFor therefore emits --panel-x and --panel-scale and .panel composes translate3d, scale, rotateX and rotateY. The second fault was in the channel writer, which emitted unitless values. A unitless non-zero number is not a valid angle, so rotateX(1.991) made the transform invalid at computed-value time and resolved it to none; a unitless 0 is accepted, which is why every resting-state check passed and the page only broke once the pointer moved. Both are now covered by asserting the computed transform is a matrix3d rather than a translate or none. Neither was visible in a code review and neither was caught by the first version of the tests, which asserted the custom properties and would have passed over a feature that rendered nothing at all. That is the whole argument for measuring rendered output: the tilt, the magnetism, the pill travel and the stagger were all written, green, and inert at one point. Each test was then checked against a real mutation rather than trusted: dropping the CSS units fails the lean test, dropping the rotations fails it too, MAGNET_PULL=0 fails the magnetic test, PILL_TAU=0.001 so the pill teleports fails the travel test, removing the (pointer: fine) gate fails the coarse-pointer test, and removing the reduced-motion gate fails the reduced-motion test. The keyboard test also had to be rewritten after it proved nothing: Chromium only applies :focus-visible to a programmatic focus() when the last input was itself a key, so the first version was asserting outline:none and treating that as the absence of a ring. It now sweeps real Tab presses and asserts every reachable button is visible, matches :focus-visible, and has a non-zero outline. Two further test-design faults worth recording, both of which had me rewriting an assertion rather than the code: a rotateY is symmetric in its angle, so leaning left and leaning right produce the same bounding box and width cannot tell them apart, so the discriminator is the inner content's screen position, which is not symmetric; and the time-based assertion could not rely on catching the easing mid-flight, so it now checks the closed-form curve across the trajectory's endpoints as well as its interior steps. The coarse-pointer and reduced-motion paths gate whether the effect is wired up at all rather than filtering its results, so nothing is observed and no inline custom properties are written. The pill still follows the section change in both cases, because that is navigation state rather than decoration, and it arrives instead of travelling; the test caught that omission when the highlight stayed on section one for a whole reduced-motion visit. Contrast is measured rather than asserted: the test walks up to the first opaque background, runs the real overlay composite in a canvas, and recomputes the WCAG ratio for both the dark glass panel and the light chat window, which is the one place with dark text on a light face. Performance, captured by scripts/tactile-evidence.mjs before and after: client JS 499.3 to 504.1 KB decoded and 614.0 KB across all chunks against the 620 KB ceiling, so roughly 6 KB of headroom; longest main-thread task 71ms to 63ms at 1280px with long tasks down from 4 to 3, and at 390px from 58ms and two long tasks to none at all; zero console errors and zero horizontal overflow at both widths before and after. The baseline was a single run and the after figures are single runs too, so the honest reading is no measurable main-thread regression rather than an improvement, because run-to-run variance on this box spans 58 to 71ms. docs/tactility.md records the design, both CSS traps, and the mutation table. DoD#3 is deliberately left unchecked: the wow factor is the owner's judgement against docs/evidence/tactile-before and tactile-after, not mine to sign off.
<!-- SECTION:NOTES:END -->
