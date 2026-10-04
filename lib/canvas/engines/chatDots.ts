'use client';

import { onReducedMotionChange, prefersReducedMotion } from '../motion';

/**
 * The Lobby's dot-matrix background.
 *
 * A calm grid that ripples outward from the bottom centre whenever a message
 * arrives, and drifts slightly toward the pointer. Ported from the prototype's
 * second script, whose rAF loop could not be cancelled and whose
 * `pulse()` had no caller after the event bus was removed.
 */

const GAP = 22;
const DOT = 1.6;
const DRIFT = 14;
const DRIFT_EASE = 0.05;
const RIPPLE_SPEED = 0.7;
const RIPPLE_WIDTH = 50;
const RIPPLE_LIFE = 1800;

export interface ChatDots {
  /** Send a ripple outward, as if a message had arrived. */
  pulse(): void;
  dispose(): void;
}

export function mountChatDots(
  canvas: HTMLCanvasElement,
  panel: HTMLElement,
): ChatDots {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { pulse: () => {}, dispose: () => {} };
  }

  let width = 0;
  let height = 0;
  let pulseAt = -1e9;
  let targetX = 0;
  let targetY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let frame = 0;
  let disposed = false;
  let dirty = true;

  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = true;
  };

  const resizeObserver = new ResizeObserver(size);
  resizeObserver.observe(canvas);
  size();

  const onPointerMove = (event: PointerEvent) => {
    const rect = panel.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }
    targetX = (event.clientX - rect.left) / rect.width - 0.5;
    targetY = (event.clientY - rect.top) / rect.height - 0.5;
  };
  const stopMotionWatch = onReducedMotionChange(() => {
    dirty = true;
  });
  panel.addEventListener('pointermove', onPointerMove, { passive: true });

  const draw = (t: number) => {
    ctx.clearRect(0, 0, width, height);
    offsetX += (targetX * DRIFT - offsetX) * DRIFT_EASE;
    offsetY += (targetY * DRIFT - offsetY) * DRIFT_EASE;

    const centreX = width * 0.5;
    const centreY = height * 0.78;
    const age = t - pulseAt;
    const ring = age * RIPPLE_SPEED;
    const fade = Math.max(0, 1 - age / RIPPLE_LIFE);

    for (let y = GAP / 2; y < height; y += GAP) {
      for (let x = GAP / 2; x < width; x += GAP) {
        const d = Math.hypot(x - centreX, y - centreY);
        let alpha = 0.1 + 0.06 * Math.sin(t * 0.0008 + (x + y) * 0.015);
        const hit = Math.max(0, 1 - Math.abs(d - ring) / RIPPLE_WIDTH) * fade;
        alpha += hit * 0.7;
        ctx.fillStyle =
          hit > 0.05 ? `rgba(61,220,132,${alpha})` : `rgba(255,255,255,${alpha})`;
        ctx.fillRect(x + offsetX, y + offsetY, DOT, DOT);
      }
    }
  };

  const loop = (t: number) => {
    if (disposed) {
      return;
    }
    frame = requestAnimationFrame(loop);
    if (prefersReducedMotion()) {
      if (dirty) {
        dirty = false;
        draw(t);
      }
      return;
    }
    draw(t);
  };
  frame = requestAnimationFrame(loop);

  return {
    pulse() {
      pulseAt = performance.now();
      dirty = true;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      panel.removeEventListener('pointermove', onPointerMove);
      stopMotionWatch();
    },
  };
}