'use client';

import { prefersReducedMotion, onReducedMotionChange } from '../motion';

/**
 * The full-bleed dot-matrix field behind everything.
 *
 * A breathing pulse that drifts slightly toward the pointer. Ported from the
 * prototype's fifth IIFE, which ran a self-rescheduling rAF and a `resize`
 * listener that were never released; this returns a disposer for both.
 */

const GAP = 26;
const DOT = 1.4;
const DRIFT = 18;
const DRIFT_EASE = 0.03;
/** Radians per ms of the breathing pulse. */
const PULSE = 0.0009;
/** How many phase steps the pulse falls off across the diagonal. */
const PULSE_SPREAD = 5;

export function mountDotfield(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return () => {};
  }

  let width = 0;
  let height = 0;
  let targetX = 0;
  let targetY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let frame = 0;
  let disposed = false;
  /** Set when reduced motion is on and a redraw is pending. */
  let dirty = true;

  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = true;
  };
  fit();

  const onResize = () => fit();
  const onPointerMove = (event: PointerEvent) => {
    targetX = event.clientX / width - 0.5;
    targetY = event.clientY / height - 0.5;
  };
  const stopMotionWatch = onReducedMotionChange(() => {
    dirty = true;
  });

  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  const draw = (t: number) => {
    offsetX += (targetX * DRIFT - offsetX) * DRIFT_EASE;
    offsetY += (targetY * DRIFT - offsetY) * DRIFT_EASE;
    ctx.clearRect(0, 0, width, height);

    const centreX = width / 2;
    const centreY = height / 2;
    const maxRadius = Math.hypot(centreX, centreY);

    for (let y = GAP / 2; y < height + GAP; y += GAP) {
      for (let x = GAP / 2; x < width + GAP; x += GAP) {
        const d = Math.hypot(x - centreX, y - centreY) / maxRadius;
        const alpha =
          (0.05 +
            0.1 * (0.5 + 0.5 * Math.sin(t * PULSE - d * PULSE_SPREAD))) *
          (1 - d * 0.55);
        // Dots nearer the edge drift less, which reads as depth.
        ctx.fillStyle = `rgba(200, 200, 255, ${alpha})`;
        ctx.fillRect(
          x + offsetX * (1 - d),
          y + offsetY * (1 - d),
          DOT,
          DOT,
        );
      }
    }
  };

  const loop = (t: number) => {
    if (disposed) {
      return;
    }
    frame = requestAnimationFrame(loop);
    if (prefersReducedMotion()) {
      // Hold a still frame; redraw only when something actually changed.
      if (dirty) {
        dirty = false;
        draw(t);
      }
      return;
    }
    draw(t);
  };
  frame = requestAnimationFrame(loop);

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointerMove);
    stopMotionWatch();
  };
}