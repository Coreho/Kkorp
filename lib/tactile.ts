/**
 * One time-based driver for every pointer-driven movement on the page.
 *
 * The prototype animated the pointer-reactive parts of the site with document
 * listeners that wrote styles directly and never removed themselves. Here the
 * movements are channels on a single shared frame loop, so there is one
 * `requestAnimationFrame` in the codebase rather than one per feature, and one
 * place to cancel it.
 *
 * Two properties matter and are easy to get wrong:
 *
 * - The loop is driven by elapsed time, not by frame count. Each channel
 *   approaches its target by `1 - exp(-dt / tau)`, which is the correct
 *   discrete form of exponential smoothing, so the same wall-clock time
 *   produces the same position at 60Hz and at 144Hz. Counting frames would
 *   make the site twice as fast on a 144Hz display.
 * - Nothing here goes through React state. A channel writes a CSS custom
 *   property on a DOM node it already holds, so a 60fps movement never
 *   re-renders a component.
 */

import { onReducedMotionChange, prefersReducedMotion } from './canvas/motion';

export interface Channel {
  /** Where the value is heading. Assigning it wakes the loop. */
  target: number;
  /** The current smoothed value. */
  value: number;
  /** Units per second, so callers can squash by speed instead of guessing. */
  velocity: number;
  /** Seconds. The time constant of the approach. */
  tau: number;
  /** Below this distance the value snaps and the channel can sleep. */
  epsilon: number;
  write(value: number, velocity: number): void;
}

/**
 * Longest step the loop will take.
 *
 * A backgrounded tab resumes with one enormous delta, which would teleport every
 * value to its target. Clamping keeps the approach continuous.
 */
const MAX_STEP = 0.064;

const channels = new Set<Channel>();
let frame = 0;
let previous = 0;

function step(now: number): void {
  const dt = previous ? Math.min(MAX_STEP, (now - previous) / 1000) : 1 / 60;
  previous = now;
  let settled = true;
  for (const channel of channels) {
    const before = channel.value;
    const next =
      before + (channel.target - before) * (1 - Math.exp(-dt / channel.tau));
    if (Math.abs(channel.target - next) < channel.epsilon) {
      channel.value = channel.target;
    } else {
      channel.value = next;
      settled = false;
    }
    channel.velocity = dt > 0 ? (channel.value - before) / dt : 0;
    channel.write(channel.value, channel.velocity);
  }
  frame = settled ? 0 : requestAnimationFrame(step);
}

/** Start the loop if it is not already running. */
export function wake(): void {
  if (frame || channels.size === 0) {
    return;
  }
  previous = 0;
  frame = requestAnimationFrame(step);
}

/** Register a channel. Returns its disposer. */
export function addChannel(channel: Channel): () => void {
  channels.add(channel);
  wake();
  return () => {
    channels.delete(channel);
  };
}

/**
 * Cancel the loop and forget every channel.
 *
 * Called on unmount. Leaving a frame request alive keeps a detached component's
 * nodes referenced and burns a core, which is the class of leak the prototype
 * was full of.
 */
export function stopAll(): void {
  if (frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  previous = 0;
  channels.clear();
}

const FINE_POINTER = '(pointer: fine)';

/**
 * True when the primary pointer can hover.
 *
 * AC#2 requires that nothing moves for a coarse pointer, a device with no fine
 * pointer at all, or a keyboard-only visitor, so this gates whether listeners
 * are attached in the first place rather than filtering their results.
 */
export function hasFinePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(FINE_POINTER).matches;
}

/** Watch for the pointer type changing, e.g. a hybrid laptop going touch-only. */
export function onPointerTypeChange(listener: (fine: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }
  const media = window.matchMedia(FINE_POINTER);
  const handler = (event: MediaQueryListEvent) => {
    listener(event.matches);
  };
  media.addEventListener('change', handler);
  return () => {
    media.removeEventListener('change', handler);
  };
}

/** True when the visitor asked for reduced motion. Re-exported for convenience. */
export function reducedMotion(): boolean {
  return prefersReducedMotion();
}

/** Subscribe to reduced-motion changes. Re-exported for convenience. */
export function onReducedMotion(listener: (reduced: boolean) => void): () => void {
  return onReducedMotionChange(listener);
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
