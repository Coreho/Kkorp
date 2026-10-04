'use client';

import type { PanelScene, SceneState } from '../types';
import { prefersReducedMotion } from '../motion';

/**
 * The Blog panel's background: a page that writes itself.
 *
 * Lines of "words" appear left to right, the page scrolls slowly, and while the
 * panel is open a short run of words glows yellow and fades. Hovering turns the
 * page into a nonstop cascade; leaving eases it back to a calm pace.
 *
 * Ported from the prototype's `page` scene. The maths is unchanged; the state
 * lives in a class instance rather than a closure, so it can be inspected and
 * the timers it owns can be cancelled.
 */

const INK = 'rgba(244, 244, 245, ';
const LINE_HEIGHT = 24;
const MAX_ROWS = 80;
const HEADING_CHANCE = 0.08;
/** Words brighten when the pointer is within this distance. */
const HIGHLIGHT_RADIUS = 46;
/** Words start pushing aside within this distance. */
const DISPLACE_RADIUS = 60;
const DISPLACE_STRENGTH = 10;
const GLOW_INTERVAL = 700;
const GLOW_DURATION = 3200;

interface Word {
  x: number;
  w: number;
  /** 0..1 highlight strength from the pointer. */
  hl: number;
  /** Horizontal displacement in px. */
  dx: number;
  /** Timestamp at which the yellow glow starts, or 0. */
  glowAt: number;
}

interface Row {
  words: Word[];
  heading: boolean;
  /** How many words have been typed out, fractional for the in-progress one. */
  shown: number;
}

export function createBlogPageScene(): PanelScene {
  let width = 0;
  let height = 0;
  let margin = 0;
  let rows: Row[] = [];
  let scroll = 0;
  let scrollTo = 0;
  let base = 0;
  let last = 0;
  let wait = 0;
  let boostUntil = 0;
  let lastGlow = 0;
  let nextHeading = false;
  /** 0 = calm page, 1 = full cascade while hovered. */
  let flow = 0;

  const makeRow = (heading: boolean): Row => {
    const words: Word[] = [];
    const max = width - margin * 2;
    const end = max * (heading ? 0.55 : 0.72 + Math.random() * 0.28);
    let x = 0;
    for (let guard = 0; guard < 60; guard++) {
      const w = heading ? 34 + Math.random() * 56 : 12 + Math.random() * 50;
      if (!(x + w <= end) && words.length > 1) {
        break;
      }
      words.push({ x, w, hl: 0, dx: 0, glowAt: 0 });
      x += w + 8;
    }
    return { words, heading, shown: 0 };
  };

  return {
    resize(state) {
      const previousUsable = width - margin * 2;
      const previousHeight = height;
      margin = Math.max(28, state.width * 0.1);
      if (width === state.width && height === state.height) {
        return;
      }
      const first = width === 0;
      width = state.width;
      height = state.height;

      if (first) {
        const count = Math.ceil((state.height * 0.6) / LINE_HEIGHT);
        for (let k = 0; k < count; k++) {
          const row = makeRow(k % 7 === 0);
          row.shown = row.words.length;
          rows.push(row);
        }
        rows.push(makeRow(false));
        base = state.height - 96 - (rows.length - 1) * LINE_HEIGHT;
        return;
      }
      // Rescale existing words so the page reflows rather than stretching.
      const factor = (state.width - margin * 2) / (previousUsable || 1);
      for (const row of rows) {
        for (const word of row.words) {
          word.x *= factor;
          word.w *= factor;
        }
      }
      base += state.height - previousHeight;
    },

    tap(_state, t) {
      nextHeading = true;
      boostUntil = t + 1600;
    },

    draw(ctx, state, t) {
      const dt = Math.min(50, t - (last || t));
      last = t;
      ctx.clearRect(0, 0, width, height);

      // Hovering cascades; leaving eases back.
      const wanted = state.inside && !state.open ? 1 : 0;
      flow += (wanted - flow) * 0.04;

      const current = rows[rows.length - 1];
      if (!current) {
        return;
      }
      const speed = (t < boostUntil ? 4 : 1) * 0.0032 * (1 + flow * 14);

      if (current.shown < current.words.length) {
        current.shown = Math.min(current.words.length, current.shown + dt * speed);
      } else if (
        (wait += dt) > (state.open ? 0 : 380 * (1 - flow)) &&
        scrollTo - scroll < LINE_HEIGHT * 1.5
      ) {
        wait = 0;
        rows.push(makeRow(nextHeading || Math.random() < HEADING_CHANCE));
        nextHeading = false;
        scrollTo += LINE_HEIGHT;
        if (rows.length > MAX_ROWS) {
          rows.shift();
          base += LINE_HEIGHT;
        }
      }

      const step = state.open
        ? dt * 0.01
        : Math.max((scrollTo - scroll) * 0.08, dt * 0.16 * flow);

      // While the panel is open, a short run of words glows yellow then fades.
      if (state.open && !prefersReducedMotion() && t - lastGlow > GLOW_INTERVAL) {
        lastGlow = t;
        const visible = rows.filter((row, k) => {
          const y = base + k * LINE_HEIGHT - scroll;
          return (
            y > height * 0.3 &&
            y < height - 60 &&
            row.shown >= row.words.length
          );
        });
        const row = visible[Math.floor(Math.random() * visible.length)];
        if (row) {
          const at = Math.floor(Math.random() * row.words.length);
          const run = 1 + Math.floor(Math.random() * 3);
          for (let i = at; i < Math.min(row.words.length, at + run); i++) {
            const word = row.words[i];
            if (word) {
              word.glowAt = t + (i - at) * 180;
            }
          }
        }
      }

      scroll = Math.min(scrollTo, scroll + step);

      // The red margin rule.
      ctx.fillStyle = 'rgba(200, 40, 40, .28)';
      ctx.fillRect(margin - 14, height * (state.open ? 0.3 : 0.44), 1, height);

      const x0 = margin;
      rows.forEach((row, k) => {
        const y = base + k * LINE_HEIGHT - scroll;
        if (y < height * (state.open ? 0.3 : 0.44) || y > height + 20) {
          return;
        }
        const full = Math.floor(row.shown);
        const part = row.shown - full;

        row.words.forEach((word, wi) => {
          if (wi > full || (wi === full && part === 0)) {
            return;
          }
          const ww = wi === full ? word.w * part : word.w;
          const cx = x0 + word.x + word.dx + ww / 2;
          const distance = state.inside
            ? Math.hypot(cx - state.pointerX, y - state.pointerY)
            : 999;

          if (distance < HIGHLIGHT_RADIUS) {
            word.hl = Math.min(1, word.hl + 0.2);
          } else {
            word.hl *= 0.994;
          }
          const push =
            distance < DISPLACE_RADIUS
              ? Math.sign(cx - state.pointerX || 1) *
                (1 - distance / DISPLACE_RADIUS) *
                DISPLACE_STRENGTH
              : 0;
          word.dx += (push - word.dx) * 0.15;

          if (word.hl > 0.02) {
            ctx.fillStyle = `rgba(253, 224, 71, ${word.hl * 0.9})`;
            ctx.fillRect(x0 + word.x + word.dx - 3, y - 8, ww + 6, 16);
          }

          if (word.glowAt && t > word.glowAt) {
            const progress = (t - word.glowAt) / GLOW_DURATION;
            if (progress >= 1) {
              word.glowAt = 0;
            } else {
              const intensity = Math.sin(Math.PI * progress);
              ctx.save();
              ctx.shadowColor = 'rgba(250, 204, 21, .95)';
              ctx.shadowBlur = 18 * intensity;
              ctx.fillStyle = `rgba(253, 224, 71, ${intensity * 0.85})`;
              ctx.fillRect(x0 + word.x + word.dx - 3, y - 8, ww + 6, 16);
              ctx.restore();
            }
          }

          ctx.fillStyle = row.heading ? `${INK}.78)` : `${INK}.3)`;
          const barHeight = row.heading ? 10 : 6;
          ctx.beginPath();
          ctx.roundRect(
            x0 + word.x + word.dx,
            y - barHeight / 2,
            ww,
            barHeight,
            barHeight / 2,
          );
          ctx.fill();
        });

        // The blinking caret on the row currently being typed.
        if (row === current && Math.floor(t / 450) % 2 === 0 && !prefersReducedMotion()) {
          const word = row.words[Math.min(full, row.words.length - 1)];
          if (word) {
            const caretX =
              x0 +
              (full < row.words.length ? word.x + word.w * part : word.x + word.w) +
              3;
            ctx.fillStyle = `${INK}.85)`;
            ctx.fillRect(caretX, y - 9, 2, 18);
          }
        }
      });
    },
  };
}