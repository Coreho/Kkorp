---
id: TASK-015
title: Add tactility and depth to the visible layer
status: To Do
assignee: []
created_date: '2026-10-04 03:29'
updated_date: '2026-10-04 06:55'
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
- [ ] #1 No new runtime dependency is added: three, @react-three/fiber, drei, gsap, framer-motion and lenis are absent from package.json, and total client JavaScript for the built application does not exceed 620 KB.
- [ ] #2 Magnetic attraction and panel tilt are pointer-only: with a coarse pointer, no fine pointer, or keyboard-only navigation, nothing moves, and the site is fully operable.
- [ ] #3 prefers-reduced-motion: reduce stops continuous canvas animation and collapses added transitions, and every control remains reachable and usable. The hard-coded reduce flag in the canvas engines is removed rather than left false.
- [ ] #4 All interactive elements remain keyboard reachable with a visible focus indicator, and the section nav and all four panels can be operated without a pointer.
- [ ] #5 At 390px there is no horizontal overflow, and tilt or magnetic movement cannot push any content outside its panel or cause a scrollbar.
- [ ] #6 Text contrast and the committed palette are unchanged; grain opacity stays low enough that body text keeps its existing measured contrast ratio.
- [ ] #7 Added pointer and animation work is time-based rather than frame-count based, so behaviour does not change with refresh rate.
- [ ] #8 Before and after screenshots are attached at 1280px and 390px, and a measurement records the client JavaScript total and the longest task in the main thread so the performance cost is visible rather than asserted.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #2 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
- [ ] #3 The wow factor is judged by the owner against before and after screenshots at both widths, not by a checkbox.
- [ ] #4 Reduced-motion and keyboard-only paths are verified by test, not assumed.
- [ ] #5 Acceptance criteria are verified with recorded evidence.
<!-- DOD:END -->
