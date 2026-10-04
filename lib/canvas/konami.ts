'use client';

/**
 * The Konami code: up up down down left right left right B A.
 *
 * Ported from the prototype, where the handler lived in the swarm's IIFE with
 * no way to remove it. It is its own module so the listener can be released,
 * and it reports the caption rather than triggering the party itself, so the
 * caller decides what effect it has.
 */

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const;

export const KONAMI_CAPTION = 'Secret unlocked. ↑↑↓↓←→←→ B A';

/**
 * Listen for the code. Ignores key presses typed into a field, as the prototype
 * did, so entering it in the chat does not trigger it.
 *
 * Returns an unsubscribe function.
 */
export function mountKonami(onUnlock: (caption: string) => void): () => void {
  let position = 0;

  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest('input, textarea, [contenteditable="true"]')
    ) {
      return;
    }
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    position =
      key === KONAMI[position]
        ? position + 1
        : key === KONAMI[0]
          ? 1
          : 0;
    if (position === KONAMI.length) {
      position = 0;
      onUnlock(KONAMI_CAPTION);
    }
  };

  document.addEventListener('keydown', onKeyDown);
  return () => {
    document.removeEventListener('keydown', onKeyDown);
  };
}
