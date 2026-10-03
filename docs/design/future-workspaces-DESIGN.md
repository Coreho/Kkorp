---
version: "alpha"
name: "Future Workspaces | Architectural Concepts"
description: "Future Workspaces Onboarding Section is designed for building reusable UI components in modern web projects. Key features include reusable structure, responsive behavior, and production-ready presentation. It is suitable for component libraries and responsive product interfaces."
colors:
  primary: "#94A3B8"
  secondary: "#1E293B"
  tertiary: "#334155"
  neutral: "#FFFFFF"
  surface: "#FFFFFF"
  text-primary: "#1E293B"
  text-secondary: "#334155"
  border: "#94A3B8"
  accent: "#94A3B8"
typography:
  headline-lg:
    fontFamily: "Inter"
    fontSize: "36px"
    fontWeight: 300
    lineHeight: "40px"
    letterSpacing: "-0.025em"
  body-md:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 300
    lineHeight: "22.75px"
spacing:
  base: "16px"
  sm: "16px"
  md: "24px"
  lg: "48px"
  xl: "96px"
  section-padding: "24px"
---

## Overview

- **Composition cues:**
  - Layout: Flex
  - Content Width: Bounded
  - Framing: Framed
  - Grid: Minimal

## Colors

The color system uses light mode with #94A3B8 as the main accent and #FFFFFF as the neutral foundation.

- **Primary (#94A3B8):** Main accent and emphasis color.
- **Secondary (#1E293B):** Supporting accent for secondary emphasis.
- **Tertiary (#334155):** Reserved accent for supporting contrast moments.
- **Neutral (#FFFFFF):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Surface: #FFFFFF; Text Primary: #1E293B; Text Secondary: #334155; Border: #94A3B8; Accent: #94A3B8

- **Gradients:** bg-gradient-to-b from-[#e8ecef] to-transparent via-[#e8ecef]/90, bg-gradient-to-b from-[#dce5ed] to-transparent via-[#dce5ed]/90, bg-gradient-to-b from-[#e5e5e5] to-transparent via-[#e5e5e5]/90, bg-gradient-to-b from-[#111111] to-transparent via-[#111111]/90

## Typography

Typography relies on Inter across display, body, and utility text.

- **Headlines (`headline-lg`):** Inter, 36px, weight 300, line-height 40px, letter-spacing -0.025em.
- **Body (`body-md`):** Inter, 14px, weight 300, line-height 22.75px.

## Layout

Layout follows a flex composition with reusable spacing tokens. Preserve the flex, bounded structural frame before changing ornament or component styling. Use 16px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a flex / bounded composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Flex
- **Content width:** Bounded
- **Base unit:** 16px
- **Scale:** 16px, 24px, 48px, 96px
- **Section padding:** 24px, 72px

## Elevation & Depth

Depth is communicated through outlined, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as outlined first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Outlined
- **Borders:** 0.8px #94A3B8; 0.8px #000000; 0.8px #FFFFFF

### Techniques
- **Gradient border shell:** Use a thin gradient border shell around the main card. Wrap the surface in an outer shell with 0px padding and a 0px radius. Drive the shell with linear-gradient(rgb(232, 236, 239), rgba(232, 236, 239, 0.9), rgba(0, 0, 0, 0)) so the edge reads like premium depth instead of a flat stroke. Keep the actual stroke understated so the gradient shell remains the hero edge treatment. Inset the real content surface inside the wrapper with a slightly smaller radius so the gradient only appears as a hairline frame.

## Shapes

Shapes stay consistent across cards, controls, and icon treatments.

- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Component styling should inherit the shared button, icon, spacing, and surface rules instead of inventing one-off treatments. Favor a small family of repeatable patterns for actions, content containers, and fields.

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 16px rhythm.
- Do reuse the Outlined surface treatment consistently across cards and controls.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 150ms and 2000ms. Easing favors ease and 0. Hover behavior focuses on stroke changes. Scroll choreography uses Parallax for section reveals and pacing.

**Motion Level:** moderate

**Durations:** 150ms, 2000ms, 300ms

**Easings:** ease, 0, 0.2, 1), cubic-bezier(0.4, cubic-bezier(0

**Hover Patterns:** stroke

**Scroll Patterns:** parallax

## WebGL

Reconstruct the graphics as a full-bleed background field using webgl, renderer, alpha, antialias, dpr clamp. The effect should read as retro-futurist, technical, and meditative: dot-matrix particle field with green on black and sparse spacing. Build it from dot particles + soft depth fade so the effect reads clearly. Animate it as slow breathing pulse. Interaction can react to the pointer, but only as a subtle drift. Preserve dom fallback.

**Id:** webgl

**Label:** WebGL

**Stack:** ThreeJS, WebGL

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
    - **Value:** WebGL, Renderer, alpha, antialias, DPR clamp

**Techniques:** Dot matrix, Breathing pulse, Pointer parallax, DOM fallback

**Code Evidence:**
  - **HTML reference:**
    - **Language:** html
    - **Snippet:**
      ```html
      <!-- WebGL Background Canvas -->
      <canvas id="webgl-canvas" class="fixed inset-0 w-full h-full z-0 pointer-events-none opacity-40"></canvas>

      <!-- Main Content Layout -->
      ```
  - **JS reference:**
    - **Language:** js
    - **Snippet:**
      ```
      // --- WebGL Background Animation (Three.js) ---
      const canvas = document.getElementById('webgl-canvas');
      const scene = new THREE.Scene();

      // Setup Camera
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;
      ```
  - **Renderer setup:**
    - **Language:** js
    - **Snippet:**
      ```
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;

      // Setup Renderer
      const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      …
      ```
  - **Scene setup:**
    - **Language:** js
    - **Snippet:**
      ```
      // --- WebGL Background Animation (Three.js) ---
      const canvas = document.getElementById('webgl-canvas');
      const scene = new THREE.Scene();

      // Setup Camera
      ```

## ThreeJS

Reconstruct the Three.js layer as a full-bleed background field with layered spatial depth that feels retro-futurist, volumetric, and technical. Use alpha, antialias, dpr clamp renderer settings, perspective, ~75deg fov, custom buffer geometry geometry, pointsmaterial materials, and ambient + key + rim lighting. Motion should read as timeline-led reveals, with poster frame + dom fallback.

**Id:** threejs

**Label:** ThreeJS

**Stack:** ThreeJS, WebGL

**Insights:**
  - **Scene:**
    - **Value:** Full-bleed background field with layered spatial depth
  - **Render:**
    - **Value:** alpha, antialias, DPR clamp
  - **Camera:**
    - **Value:** Perspective, ~75deg FOV
  - **Lighting:**
    - **Value:** ambient + key + rim
  - **Materials:**
    - **Value:** PointsMaterial
  - **Geometry:**
    - **Value:** custom buffer geometry
  - **Motion:**
    - **Value:** Timeline-led reveals

**Techniques:** Particle depth, Timeline beats, alpha, antialias, DPR clamp, Poster frame + DOM fallback

**Code Evidence:**
  - **HTML reference:**
    - **Language:** html
    - **Snippet:**
      ```html
      <!-- WebGL Background Canvas -->
      <canvas id="webgl-canvas" class="fixed inset-0 w-full h-full z-0 pointer-events-none opacity-40"></canvas>

      <!-- Main Content Layout -->
      ```
  - **JS reference:**
    - **Language:** js
    - **Snippet:**
      ```
      // --- WebGL Background Animation (Three.js) ---
      const canvas = document.getElementById('webgl-canvas');
      const scene = new THREE.Scene();

      // Setup Camera
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;
      ```
  - **Renderer setup:**
    - **Language:** js
    - **Snippet:**
      ```
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;

      // Setup Renderer
      const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      …
      ```
  - **Scene setup:**
    - **Language:** js
    - **Snippet:**
      ```
      // --- WebGL Background Animation (Three.js) ---
      const canvas = document.getElementById('webgl-canvas');
      const scene = new THREE.Scene();

      // Setup Camera
      ```
