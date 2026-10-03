---
version: "alpha"
name: "Meridian Editorial Carousel"
description: "A full-screen futuristic editorial product carousel with animated panels, particle atmosphere, and premium framed interface details."
colors:
  primary: "#4B4BA0"
  secondary: "#FFFFFF"
  tertiary: "#8F47AE"
  neutral: "#FFFFFF"
  background: "#FFFFFF"
  surface: "#000000"
  text-primary: "#FFFFFF"
  text-secondary: "#F4F4F5"
  border: "#FFFFFF"
  accent: "#4B4BA0"
typography:
  display-lg:
    fontFamily: "Montserrat"
    fontSize: "128px"
    fontWeight: 400
    lineHeight: "128px"
    letterSpacing: "-0.025em"
    textTransform: "uppercase"
  body-md:
    fontFamily: "Montserrat"
    fontSize: "8.8px"
    fontWeight: 400
    lineHeight: "13.2px"
    letterSpacing: "0.1818em"
    textTransform: "uppercase"
  label-md:
    fontFamily: "Montserrat"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
rounded:
  full: "9999px"
spacing:
  base: "4px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "10px"
  gap: "8px"
  card-padding: "10px"
  section-padding: "32px"
components:
  button-primary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "8px"
---

## Overview

- **Composition cues:**
  - Layout: Grid
  - Content Width: Full Bleed
  - Framing: Glassy
  - Grid: Strong

## Colors

The color system uses dark mode with #4B4BA0 as the main accent and #FFFFFF as the neutral foundation.

- **Primary (#4B4BA0):** Main accent and emphasis color.
- **Secondary (#FFFFFF):** Supporting accent for secondary emphasis.
- **Tertiary (#8F47AE):** Reserved accent for supporting contrast moments.
- **Neutral (#FFFFFF):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #FFFFFF; Surface: #000000; Text Primary: #FFFFFF; Text Secondary: #F4F4F5; Border: #FFFFFF; Accent: #4B4BA0

- **Gradients:** bg-gradient-to-r from-transparent to-transparent via-white/15

## Typography

Typography relies on Montserrat across display, body, and utility text.

- **Display (`display-lg`):** Montserrat, 128px, weight 400, line-height 128px, letter-spacing -0.025em, uppercase.
- **Body (`body-md`):** Montserrat, 8.8px, weight 400, line-height 13.2px, letter-spacing 0.1818em, uppercase.
- **Labels (`label-md`):** Montserrat, 16px, weight 400, line-height 24px.

## Layout

Layout follows a grid composition with reusable spacing tokens. Preserve the grid, full bleed structural frame before changing ornament or component styling. Use 4px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a grid / full bleed composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Grid
- **Content width:** Full Bleed
- **Base unit:** 4px
- **Scale:** 4px, 6px, 8px, 10px, 12px, 16px, 32px
- **Section padding:** 32px
- **Card padding:** 10px, 32px
- **Gaps:** 8px, 12px

## Elevation & Depth

Depth is communicated through glass, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as glass first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Glass
- **Borders:** 0.8px #FFFFFF
- **Shadows:** rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.25) 0px 25px 50px -12px; rgba(255, 255, 255, 0.35) 0px 1px 0px 0px inset, rgba(0, 0, 0, 0.5) 0px -2px 6px 0px inset, rgba(0, 0, 0, 0.5) 0px 8px 20px 0px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px
- **Blur:** 12px, 24px

### Techniques
- **Gradient border shell:** Use a thin gradient border shell around the main card. Wrap the surface in an outer shell with 32px padding and a 0px radius. Drive the shell with none so the edge reads like premium depth instead of a flat stroke. Keep the actual stroke understated so the gradient shell remains the hero edge treatment. Inset the real content surface inside the wrapper with a slightly smaller radius so the gradient only appears as a hairline frame.

## Shapes

Shapes rely on a tight radius system anchored by 16px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 16px, 32px, 9999px
- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Anchor interactions to the detected button styles.

### Buttons
- **Primary:** background #000000, text #FFFFFF, radius 9999px, padding 8px, border 0.8px solid rgba(255, 255, 255, 0.1).

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 4px rhythm.
- Do reuse the Glass surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 16px, 32px, 9999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 150ms and 300ms. Easing favors ease and cubic-bezier(0.4. Hover behavior focuses on color and transform changes.

**Motion Level:** moderate

**Durations:** 150ms, 300ms

**Easings:** ease, cubic-bezier(0.4, 0, 0.2, 1)

**Hover Patterns:** color, transform

## WebGL

Reconstruct the graphics as a full-bleed background field using alpha, antialias, dpr clamp, custom shaders. The effect should read as technical, meditative, and atmospheric: dot-matrix particle field with black and sparse spacing. Build it from dot particles + soft depth fade so the effect reads clearly. Animate it as slow breathing pulse. Interaction can react to the pointer, but only as a subtle drift. Preserve reduced motion + dom fallback.

**Id:** webgl

**Label:** WebGL

**Stack:** WebGL

**Insights:**
  - **Scene:**
    - **Value:** Full-bleed background field
  - **Effect:**
    - **Value:** Dot-matrix particle field
  - **Primitives:**
    - **Value:** Dot particles + soft depth fade
  - **Motion:**
    - **Value:** Slow breathing pulse
  - **Interaction:**
    - **Value:** Pointer-reactive drift
  - **Render:**
    - **Value:** alpha, antialias, DPR clamp, custom shaders

**Techniques:** Dot matrix, Breathing pulse, Pointer parallax, Shader gradients, DOM fallback

**Code Evidence:**
  - **HTML reference:**
    - **Language:** html
    - **Snippet:**
      ```html
      <body class="min-h-screen overflow-hidden bg-black text-zinc-100 antialiased" style="font-family: Montserrat, sans-serif;">
        <main class="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black p-3 sm:p-5 lg:p-8">
          <canvas id="webgl-field" aria-hidden="true" class="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-40 mix-blend-screen"></canvas>

          <section aria-label="M…
      ```
