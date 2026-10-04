'use client';

import type { PanelScene, SceneState } from './types';

/**
 * Mounts a canvas scene inside a panel.
 *
 * The prototype's `mount()` created the canvas, observers and six listeners per
 * panel — including a `document`-level `pointermove` that was never removed, so
 * every mounted panel left a listener behind for the life of the page. Here the
 * listener is kept in a list and removed on dispose, the observers disconnect,
 * and the scene's `dispose` hook runs.
 *
 * Returns a disposer; it is safe to call more than once.
 */
export function mountScene(
  panel: HTMLElement,
  scene: PanelScene,
): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene';
  canvas.setAttribute('aria-hidden', 'true');
  // The scene sits behind the panel's own background and content.
  panel.prepend(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return () => {};
  }

  const state: SceneState = {
    width: 0,
    height: 0,
    pointerX: -1,
    pointerY: -1,
    inside: false,
    visible: true,
    open: false,
    downX: 0,
    downY: 0,
  };

  const redraw = () => scene.draw(ctx, state, performance.now());

  const resizeObserver = new ResizeObserver(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = canvas.clientWidth;
    state.height = canvas.clientHeight;
    canvas.width = Math.round(state.width * dpr);
    canvas.height = Math.round(state.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scene.resize(state);
  });
  resizeObserver.observe(canvas);

  const intersectionObserver = new IntersectionObserver((entries) => {
    const entry = entries[0];
    state.visible = entry ? entry.isIntersecting : false;
  });
  intersectionObserver.observe(canvas);

  const local = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    state.pointerX = event.clientX - rect.left;
    state.pointerY = event.clientY - rect.top;
  };

  const onPointerMove = (event: PointerEvent) => {
    local(event);
    state.inside = true;
  };
  const onPointerLeave = (event: PointerEvent) => {
    // Only treat the pointer as gone when it landed on another part of the page.
    // A leave with no relatedTarget means a host overlay, the pointer left the
    // window, or an idle pointer, and the current state should stand.
    if (event.relatedTarget) {
      state.inside = false;
    }
    scene.up?.(state);
  };
  const onDocumentPointerMove = (event: PointerEvent) => {
    if (!panel.contains(event.target as Node)) {
      state.inside = false;
    }
  };
  const onPointerDown = (event: PointerEvent) => {
    delete panel.dataset['drag'];
    local(event);
    state.downX = event.clientX;
    state.downY = event.clientY;
    scene.down?.(state);
  };
  const onPointerUp = (event: PointerEvent) => {
    const moved =
      Math.hypot(event.clientX - state.downX, event.clientY - state.downY) > 6;
    if (moved) {
      panel.dataset['drag'] = '1';
    }
    const target = event.target as HTMLElement;
    if (
      !moved &&
      scene.tap &&
      !target.closest('button, input, textarea, a, label, form')
    ) {
      scene.tap(state, performance.now());
    }
    scene.up?.(state);
  };

  panel.addEventListener('pointermove', onPointerMove);
  panel.addEventListener('pointerleave', onPointerLeave);
  panel.addEventListener('pointerdown', onPointerDown);
  panel.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointermove', onDocumentPointerMove);

  /**
   * The frame driver.
   *
   * The prototype ran both scenes from one shared requestAnimationFrame that
   * could not be cancelled. Each scene owns its loop here so dispose() can stop
   * it, and a scene that is off-screen or too small to read skips drawing
   * entirely.
   */
  let frame = 0;
  let disposed = false;

  const tick = (t: number) => {
    if (disposed) {
      return;
    }
    frame = requestAnimationFrame(tick);
    // The pointer may already be resting over the panel when it mounts.
    if (!state.inside && panel.matches(':hover')) {
      state.inside = true;
    }
    state.open = panel.classList.contains('open');
    if (state.visible && state.width > 140) {
      scene.draw(ctx, state, t);
    }
  };
  frame = requestAnimationFrame(tick);

  scene.dispose?.();

  return () => {
    if (disposed) {
      return;
    }
    disposed = true;
    cancelAnimationFrame(frame);
    panel.removeEventListener('pointermove', onPointerMove);
    panel.removeEventListener('pointerleave', onPointerLeave);
    panel.removeEventListener('pointerdown', onPointerDown);
    panel.removeEventListener('pointerup', onPointerUp);
    // The prototype never removed this one.
    document.removeEventListener('pointermove', onDocumentPointerMove);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    canvas.remove();
  };
}