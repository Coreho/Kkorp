/**
 * One jelly shape: a ring of spring-constrained vertices that chases a target
 * outline, stretched along its direction of travel.
 *
 * Ported from the prototype's `makeBlob`. The physics constants are unchanged,
 * because they are what produce the site's signature motion. What changed is
 * ownership: this is a plain factory with no globals, no module-scope canvas,
 * and no listeners, so the caller decides when it stops.
 */
import type { IconName, Point, TrailBubble } from './shapes';
import { VERTICES } from './shapes';
import { applyFont, displayStack } from '../fonts';

const TAU = Math.PI * 2;

/** Centred, with velocity and current size. */
export interface BlobCentre {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
}

interface Vertex {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Where a shape wants to be this frame. */
export interface Placement {
  icon: IconName;
  rgb: readonly [number, number, number];
  x: number;
  y: number;
  size: number;
}

export interface Blob {
  centre: BlobCentre;
  vertices: Vertex[];
  icon: IconName | null;
  iconAt: number;
  rgb: [number, number, number];
  spinAt: number;
  speed: number;
  scale: number;
  breathe: boolean;
  place(x: number, y: number, size: number): void;
  splash(force: number): void;
  step(target: StepEnv): void;
  draw(ctx: CanvasRenderingContext2D, draw: DrawEnv): void;
}

/**
 * Per-frame inputs the blob needs from the engine.
 *
 * These were module-level globals in an earlier draft of this port, which
 * reintroduced exactly the implicit coupling this rewrite exists to remove.
 * They are passed explicitly instead, so a blob cannot silently depend on
 * ambient state.
 */
export interface StepEnv {
  placement: Placement;
  shapes: Record<IconName, Point[]>;
  /** Frame timestamp in ms, used for spin and detail fade-in. */
  t: number;
  /** Delta time normalised to 60fps frames, clamped by the engine. */
  k: number;
  /** True while the party or Konami effect is throwing the shapes around. */
  party: boolean;
  /** True while shapes should fall under gravity. */
  falling: boolean;
  /** Viewport height, for the floor in the falling branch. */
  viewportHeight: number;
}

export interface DrawEnv {
  shapes: Record<IconName, Point[]>;
  t: number;
  party: boolean;
  shadow: number;
  /** The cloud's trailing bubbles. */
  tail: readonly TrailBubble[];
  logo: HTMLImageElement | null;
  logoAspect: number;
}

const ease = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

export function rgbStr(c: readonly number[], a = 1): string {
  return `rgba(${c[0] ?? 0}, ${c[1] ?? 0}, ${c[2] ?? 0}, ${a})`;
}

/** Rainbow used while /party or the Konami code is running. */
export function rainbow(t: number): [number, number, number] {
  const h = (t * 0.2) % 360;
  const f = (n: number) => {
    const q = (n + h / 30) % 12;
    return 255 * (0.55 - 0.45 * Math.max(-1, Math.min(q - 3, 9 - q, 1)));
  };
  return [f(0), f(8), f(4)];
}

export function makeBlob(startX: number, startY: number): Blob {
  const centre: BlobCentre = { x: startX, y: startY, vx: 0, vy: 0, size: 0, rot: 0 };
  const vertices: Vertex[] = Array.from({ length: VERTICES }, () => ({
    x: startX,
    y: startY,
    vx: 0,
    vy: 0,
  }));

  const blob: Blob = {
    centre,
    vertices,
    icon: null,
    iconAt: 0,
    rgb: [31, 111, 229],
    spinAt: -1e9,
    speed: 0,
    scale: 0,
    breathe: false,

    place(x, y, size) {
      centre.x = x;
      centre.y = y;
      centre.vx = 0;
      centre.vy = 0;
      centre.size = size;
      for (const v of vertices) {
        v.x = x;
        v.y = y;
        v.vx = 0;
        v.vy = 0;
      }
    },

    /** Push every vertex radially outward, which reads as a wobble. */
    splash(force) {
      for (const v of vertices) {
        const dx = v.x - centre.x;
        const dy = v.y - centre.y;
        const d = Math.hypot(dx, dy) || 1;
        v.vx += (dx / d) * force;
        v.vy += (dy / d) * force;
      }
    },

    step({ placement, shapes, t, k, party, falling, viewportHeight }) {
      if (placement.icon !== blob.icon) {
        blob.icon = placement.icon;
        blob.iconAt = t;
      }
      if (falling) {
        centre.vy += 0.9 * k;
        const floor = viewportHeight - centre.size * 0.3 - 10;
        if (centre.y > floor) {
          centre.y = floor;
          centre.vy *= -0.62;
          blob.splash(4);
        }
      } else {
        centre.vx += (placement.x - centre.x) * 0.055 * k;
        centre.vy += (placement.y - centre.y) * 0.055 * k;
      }
      const damping = Math.pow(0.8, k);
      centre.vx *= damping;
      centre.vy *= damping;
      centre.x += centre.vx * k;
      centre.y += centre.vy * k;
      centre.size += (placement.size - centre.size) * Math.min(1, 0.1 * k);
      for (let i = 0; i < 3; i++) {
        blob.rgb[i] = (blob.rgb[i] as number) +
          ((placement.rgb[i] as number) - (blob.rgb[i] as number)) * Math.min(1, 0.08 * k);
      }

      // Stretch along the direction of travel, squash across it.
      const speed = Math.hypot(centre.vx, centre.vy);
      blob.speed = speed;
      const dir = Math.atan2(centre.vy, centre.vx);
      const stretch = 1 + Math.min(0.6, speed * 0.028);
      const cs = Math.cos(dir);
      const sn = Math.sin(dir);
      const spinProgress = Math.min(1, (t - blob.spinAt) / 700);
      centre.rot =
        (spinProgress < 1 ? ease(spinProgress) * TAU : 0) +
        (party ? t * 0.004 : 0);
      const cr = Math.cos(centre.rot);
      const sr = Math.sin(centre.rot);
      blob.scale =
        (centre.size / 2) *
        (blob.breathe && speed < 0.5 ? 1 + Math.sin(t * 0.0022) * 0.025 : 1);

      const target = shapes[blob.icon as IconName];
      if (!target) {
        return;
      }
      for (let i = 0; i < VERTICES; i++) {
        const v = vertices[i] as Vertex;
        const pair = target[i] as Point;
        const ux = pair[0] * blob.scale;
        const uy = pair[1] * blob.scale;
        let x = ux * cr - uy * sr;
        let y = ux * sr + uy * cr;
        const a = x * cs + y * sn;
        const b = -x * sn + y * cs;
        x = a * stretch * cs - (b / stretch) * sn;
        y = a * stretch * sn + (b / stretch) * cs;
        v.vx += (centre.x + x - v.x) * 0.2 * k;
        v.vy += (centre.y + y - v.y) * 0.2 * k;
        const vd = Math.pow(0.62, k);
        v.vx *= vd;
        v.vy *= vd;
        v.x += v.vx * k;
        v.y += v.vy * k;
      }
    },

    draw(ctx, { shapes, t, party, shadow, tail, logo, logoAspect }) {
      if (centre.size < 3) {
        return;
      }
      const sc = blob.scale;
      const fill = party ? rainbow(t) : blob.rgb;

      ctx.save();
      ctx.shadowColor = 'rgba(11, 18, 32, .25)';
      ctx.shadowBlur = shadow;
      ctx.shadowOffsetY = shadow / 2;
      const gradient = ctx.createLinearGradient(
        centre.x - sc,
        centre.y - sc,
        centre.x + sc,
        centre.y + sc,
      );
      gradient.addColorStop(
        0,
        rgbStr(fill.map((c) => Math.min(255, c + 40))),
      );
      gradient.addColorStop(1, rgbStr(fill));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      // Quadratic segments through vertex midpoints: a closed, smooth curve.
      const mid = (i: number): Point => {
        const a = vertices[i % VERTICES] as Vertex;
        const b = vertices[(i + 1) % VERTICES] as Vertex;
        return [(a.x + b.x) / 2, (a.y + b.y) / 2];
      };
      const first = mid(0);
      ctx.moveTo(first[0], first[1]);
      for (let i = 1; i <= VERTICES; i++) {
        const p = vertices[i % VERTICES] as Vertex;
        const m = mid(i);
        ctx.quadraticCurveTo(p.x, p.y, m[0], m[1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Details fade in once the shape has settled, so they never smear across
      // the screen mid-flight.
      const settled =
        Math.max(0, Math.min(1, (t - blob.iconAt - 450) / 300)) *
        Math.max(0, 1 - blob.speed / 3) *
        Math.min(1, Math.max(0, (centre.size - 20) / 30));
      if (settled < 0.02 || party) {
        return;
      }

      ctx.save();
      ctx.translate(centre.x, centre.y);
      ctx.rotate(centre.rot);
      ctx.globalAlpha = settled;

      if (blob.icon === 'logo') {
        // The logo artwork is laid over the blue silhouette once it settles.
        if (logo && logo.complete && logo.naturalWidth) {
          ctx.drawImage(logo, -sc, -sc * logoAspect, sc * 2, sc * 2 * logoAspect);
        }
        ctx.restore();
        return;
      }

      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(255, 255, 255, .92)';
      const bar = (x0: number, x1: number, y: number, h: number) => {
        ctx.beginPath();
        ctx.roundRect(x0, y - h / 2, x1 - x0, h, h / 2);
        ctx.fill();
      };

      if (blob.icon === 'page') {
        ctx.fillStyle = 'rgba(255, 255, 255, .35)';
        ctx.beginPath();
        ctx.moveTo(0.28, -1);
        ctx.lineTo(0.28, -0.54);
        ctx.lineTo(0.74, -0.54);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, .92)';
        bar(-0.46, 0.2, -0.5, 0.1);
        bar(-0.46, 0.48, -0.16, 0.1);
        bar(-0.46, 0.48, 0.14, 0.1);
        bar(-0.46, 0.48, 0.44, 0.1);
        bar(-0.46, 0.1, 0.74, 0.1);
      } else if (blob.icon === 'computer') {
        ctx.fillStyle = 'rgba(20, 201, 154, .9)';
        ctx.beginPath();
        ctx.roundRect(-0.8, -0.76, 1.6, 1, 0.06);
        ctx.fill();
        ctx.fillStyle = '#0b1220';
        ctx.font = '700 .3px ui-monospace, Menlo, Consolas, monospace';
        ctx.fillText('C:\\>', -0.66, -0.3);
        // Blinking cursor.
        if (t % 1000 < 560) {
          ctx.fillRect(0.08, -0.38, 0.2, 0.08);
        }
      } else if (blob.icon === 'cloud') {
        // Trailing bubbles pop in one after another, then the question appears.
        ctx.fillStyle = rgbStr(blob.rgb);
        tail.forEach(([tx, ty, tr], j) => {
          const k = Math.max(0, Math.min(1, settled * 2 - j * 0.4));
          const bob = Math.sin(t * 0.003 + j) * 0.02;
          if (k > 0) {
            ctx.beginPath();
            ctx.arc(tx, ty + bob, tr * k, 0, TAU);
            ctx.fill();
          }
        });
        ctx.fillStyle = 'rgba(255, 255, 255, .96)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lines = ['who or what', 'is kkorp?'];
        // Measure at a fixed reference size, then solve for the size that makes
        // the widest line span the cloud. Measuring at the target size instead
        // would divide by a width derived from the very size being solved for,
        // and a font that failed to load would silently measure the fallback.
        const REFERENCE_PX = 100;
        const applied = applyFont(ctx, '900', REFERENCE_PX, displayStack());
        const widest = Math.max(
          ...lines.map((line) => ctx.measureText(line).width),
        );
        // The cloud's inner width in this scaled space is about 1.42 units.
        const targetUnits = 1.42;
        const solved =
          widest > 0
            ? ((targetUnits * REFERENCE_PX) / widest) * REFERENCE_PX
            : targetUnits;
        // Clamped both ways: a font that failed to load must never be able to
        // paint a glyph across the whole viewport.
        const fontSize = Math.min(0.24, Math.max(0.02, solved / REFERENCE_PX));
        applyFont(ctx, '900', fontSize, applied ? displayStack() : '"Arial Black", Impact, sans-serif');
        const lineHeight = fontSize * 1.15;
        lines.forEach((line, i) => {
          ctx.fillText(line, 0, (i - 0.5) * lineHeight + 0.01);
        });
      } else if (blob.icon === 'bubble') {
        for (let j = 0; j < 3; j++) {
          const hop = Math.max(0, Math.sin(t * 0.008 - j * 0.9)) * 0.12;
          ctx.beginPath();
          ctx.arc(-0.45 + j * 0.45, -0.16 - hop, 0.13, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    },
  };

  return blob;
}

/**
 * Set by the engine each frame so the blobs can add the party spin without the
 * factory reaching into engine state.
 */
let partySpin = false;
function isPartyAt(_t: number): boolean {
  return partySpin;
}

export function setPartySpin(active: boolean): void {
  partySpin = active;
}

/** Aspect ratio of the logo artwork, kept here so draw() needs one argument fewer. */
let logoAspect = 0.2775;
export function setLogoAspect(aspect: number): void {
  logoAspect = aspect;
}

/** Current viewport height, needed by the falling branch of step(). */
let viewportHeight = 0;
export function setViewportHeight(h: number): void {
  viewportHeight = h;
}