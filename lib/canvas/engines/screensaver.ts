'use client';

import { applyFont, displayStack } from '../fonts';
import { onReducedMotionChange, prefersReducedMotion } from '../motion';

/**
 * The idle screensaver: after 25 seconds without input the wordmark breaks
 * into pixels that bounce around a black screen, changing colour on every wall
 * hit, with a counter for exact corner hits.
 *
 * Ported from the prototype's fourth IIFE, which registered six capture-phase
 * `document` listeners and an interval that were never released, kept a 25s
 * timer as the only cancellable one in the file, and exposed itself as
 * `window.kkScreensaver`. Everything is torn down by `dispose` here.
 */

const IDLE_MS = 25_000;
/** Ignore activity this soon after appearing, so it does not wake instantly. */
const SETTLE_MS = 700;
/** Two wall hits within this window count as a corner. */
const CORNER_WINDOW = 90;
const FONT_WEIGHT = '900';

const COLORS = [
  '#ff3fbf',
  '#14c99a',
  '#8b7bff',
  '#ffd23f',
  '#ff6b3d',
  '#3fc5ff',
] as const;

interface Pixel {
  ox: number;
  oy: number;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
}

export interface Screensaver {
  /** Show the screensaver now, e.g. from the `/screensaver` chat command. */
  start(): void;
  dispose(): void;
}

export function mountScreensaver(options: {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  cornersEl: HTMLElement;
  flashEl: HTMLElement;
}): Screensaver {
  const { container, canvas, cornersEl, flashEl } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { start: () => {}, dispose: () => {} };
  }

  let on = false;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let width = 0;
  let height = 0;
  let pixels: Pixel[] = [];
  let blockW = 0;
  let blockH = 0;
  let x = 40;
  let y = 40;
  let vx = 2.4;
  let vy = 1.8;
  let colour = 0;
  let corners = 0;
  let last = 0;
  let hitX = -1e9;
  let hitY = -1e9;
  let shownAt = 0;
  let frame = 0;
  let disposed = false;
  /** Set when reduced motion is on and a redraw is pending. */
  let dirty = false;
  /**
   * The click that wakes the screensaver must not reach the page underneath,
   * or dismissing it would also activate whatever was clicked.
   */
  let swallowClick = false;

  /** Rasterise the wordmark and sample it into a pixel grid. */
  const build = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const fontSize = Math.max(36, Math.min(width * 0.14, 120));
    const stack = displayStack();

    // Measure on an offscreen canvas at a known size, then size the offscreen
    // bitmap to fit. Sizing it after measuring is what keeps the sample grid
    // aligned with the glyphs.
    const scratch = document.createElement('canvas');
    const scratchCtx = scratch.getContext('2d');
    if (!scratchCtx) {
      return;
    }
    const probe = applyFont(scratchCtx, FONT_WEIGHT, fontSize, stack);
    blockW = Math.ceil(
      probe
        ? scratchCtx.measureText('KoreoKorp').width
        : 'KoreoKorp'.length * fontSize * 0.62,
    ) + 8;
    blockH = Math.ceil(fontSize * 1.15);
    scratch.width = blockW;
    scratch.height = blockH;

    // Resetting the bitmap resets the context state, so the font is re-applied.
    applyFont(scratchCtx, FONT_WEIGHT, fontSize, stack);
    scratchCtx.textBaseline = 'middle';
    scratchCtx.fillText('KoreoKorp', 4, blockH / 2);

    const image = scratchCtx.getImageData(0, 0, blockW, blockH).data;
    const gap = Math.max(3, Math.round(fontSize / 30));
    pixels = [];
    for (let py = 0; py < blockH; py += gap) {
      for (let px = 0; px < blockW; px += gap) {
        if ((image[(py * blockW + px) * 4 + 3] ?? 0) > 128) {
          pixels.push({ ox: px, oy: py, dx: 0, dy: 0, vx: 0, vy: 0 });
        }
      }
    }
    x = Math.min(x, Math.max(0, width - blockW));
    y = Math.min(y, Math.max(0, height - blockH));
  };

  const burst = () => {
    for (const p of pixels) {
      const a = Math.random() * Math.PI * 2;
      const f = 4 + Math.random() * 12;
      p.vx += Math.cos(a) * f;
      p.vy += Math.sin(a) * f;
    }
  };

  const draw = (t: number) => {
    // Fade the trail rather than clearing, so the pixels leave a comet tail.
    ctx.fillStyle = 'rgba(5, 5, 10, .3)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = COLORS[colour] as string;
    for (const p of pixels) {
      p.vx += -p.dx * 0.04;
      p.vy += -p.dy * 0.04;
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.dx += p.vx;
      p.dy += p.vy;
      ctx.fillRect(
        x + p.ox + p.dx,
        y + p.oy + p.dy + Math.sin(t * 0.003 + p.ox * 0.05) * 1.2,
        2.6,
        2.6,
      );
    }
  };

  const loop = (t: number) => {
    if (!on || disposed) {
      return;
    }
    frame = requestAnimationFrame(loop);
    const k = Math.min(3, (t - (last || t)) / 16.7);
    last = t;

    x += vx * k;
    y += vy * k;
    if (x <= 0 || x + blockW >= width) {
      vx = -vx;
      x = Math.max(0, Math.min(x, width - blockW));
      colour = (colour + 1) % COLORS.length;
      hitX = t;
    }
    if (y <= 0 || y + blockH >= height) {
      vy = -vy;
      y = Math.max(0, Math.min(y, height - blockH));
      colour = (colour + 1) % COLORS.length;
      hitY = t;
    }
    // Two walls within the corner window, hit on the same frame, is a corner.
    if (Math.abs(hitX - hitY) < CORNER_WINDOW && Math.max(hitX, hitY) === t) {
      corners += 1;
      cornersEl.textContent = String(corners);
      burst();
      flashEl.textContent = corners === 1 ? 'CORNER!' : `CORNER! ×${corners}`;
      flashEl.classList.remove('show');
      // Force a reflow so the animation restarts.
      void flashEl.offsetWidth;
      flashEl.classList.add('show');
    }

    if (prefersReducedMotion()) {
      if (dirty) {
        dirty = false;
        draw(t);
      }
      return;
    }
    draw(t);
  };

  const clearHideTimer = () => {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const stop = () => {
    if (!on) {
      return;
    }
    on = false;
    cancelAnimationFrame(frame);
    container.classList.remove('on');
    clearHideTimer();
    // Wait out the fade before hiding, but only if it did not come back.
    hideTimer = setTimeout(() => {
      if (!on) {
        container.hidden = true;
      }
    }, 600);
  };

  const start = () => {
    if (on || disposed) {
      return;
    }
    clearHideTimer();
    on = true;
    shownAt = performance.now();
    container.hidden = false;
    build();
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, width, height);
    requestAnimationFrame(() => {
      container.classList.add('on');
    });
    last = 0;
    frame = requestAnimationFrame(loop);
  };

  const scheduleIdle = () => {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(start, IDLE_MS);
  };

  const onActivity = (event: Event) => {
    if (event.type === 'click' && swallowClick) {
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (on) {
      // Ignore jitter right after it appears.
      if (performance.now() - shownAt < SETTLE_MS) {
        return;
      }
      if (event.type === 'pointerdown') {
        event.preventDefault();
        event.stopPropagation();
        // The matching click must be swallowed too, or it would activate
        // whatever is underneath.
        swallowClick = true;
      }
      stop();
    }
    scheduleIdle();
  };

  const onResize = () => {
    if (on) {
      build();
      dirty = true;
    }
  };
  const stopMotionWatch = onReducedMotionChange(() => {
    dirty = true;
  });

  const EVENTS = [
    'pointermove',
    'pointerdown',
    'click',
    'keydown',
    'wheel',
    'touchstart',
  ] as const;
  for (const type of EVENTS) {
    document.addEventListener(type, onActivity, {
      capture: true,
      passive: type !== 'pointerdown' && type !== 'click',
    });
  }
  window.addEventListener('resize', onResize);
  scheduleIdle();

  return {
    start,
    dispose() {
      disposed = true;
      stop();
      if (idleTimer !== null) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      clearHideTimer();
      for (const type of EVENTS) {
        document.removeEventListener(type, onActivity, { capture: true } as never);
      }
      window.removeEventListener('resize', onResize);
      stopMotionWatch();
    },
  };
}