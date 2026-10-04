/**
 * Reduced-motion detection, shared by every canvas engine.
 *
 * The prototype hard-coded `const reduce = false` in each engine, so its
 * `prefers-reduced-motion` block only ever affected CSS while the canvases
 * animated regardless of the user's setting. This is the real check.
 */

let cached: boolean | null = null;
const query = '(prefers-reduced-motion: reduce)';

function read(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(query).matches;
}

/** True when the visitor has asked for reduced motion. */
export function prefersReducedMotion(): boolean {
  if (cached === null) {
    cached = read();
  }
  return cached;
}

/**
 * Subscribe to changes in the preference.
 *
 * Returns an unsubscribe function. Engines call this so a visitor who turns
 * reduced motion on mid-visit is respected immediately.
 */
export function onReducedMotionChange(listener: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }
  const media = window.matchMedia(query);
  const handler = (event: MediaQueryListEvent) => {
    cached = event.matches;
    listener(event.matches);
  };
  media.addEventListener('change', handler);
  return () => {
    media.removeEventListener('change', handler);
  };
}