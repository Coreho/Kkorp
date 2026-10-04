/**
 * Outline shapes for the jelly swarm.
 *
 * Every outline is a closed contour in a unit box (-1..1, y down). The swarm
 * resamples each one to the same vertex count so any shape can morph into any
 * other, which is why the logo is stored as a traced polygon rather than drawn
 * as an image: the blue silhouette *is* the morph target.
 *
 * The logo outline is imported from assets/koreokorp-logo-outline.json rather
 * than pasted in here. The prototype carried both copies; they were verified
 * identical, and a single source is the only way they can stay that way.
 */
import outline from '@/assets/koreokorp-logo-outline.json';

export type Point = readonly [number, number];

/** A trailing thought bubble: centre plus radius, in the cloud's space. */
export type TrailBubble = readonly [number, number, number];

/** Vertices per shape. Must match the swarm's vertex count. */
export const VERTICES = 320;
const TAU = Math.PI * 2;

/**
 * Rounded rectangle with an optional tail, as a point list.
 * Used for the Projects computer and the Lobby speech bubble, which are
 * rectangles with a stem rather than traced artwork.
 */
export function roundRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  tail: Point[] | null,
): Point[] {
  const pts: Point[] = [];
  const arc = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 8; i++) {
      const a = a0 + (i / 8) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  arc(x1 - r, y0 + r, -Math.PI / 2);
  arc(x1 - r, y1 - r, 0);
  if (tail) {
    pts.push(...tail);
  }
  arc(x0 + r, y1 - r, Math.PI / 2);
  arc(x0 + r, y0 + r, Math.PI);
  return pts;
}

/**
 * The About thought cloud.
 *
 * Drawn as overlapping puffs on a scratch canvas, then the outer edge is traced
 * with a Moore-neighbour boundary walk into one closed outline, so it can morph
 * like the other icons. The two trailing bubbles are kept separately and drawn
 * as details, because they pop in one after another rather than morphing.
 */
function traceCloud(): { poly: Point[]; tail: TrailBubble[] } {
  const size = 300;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable; cannot trace the cloud icon');
  }
  ctx.fillStyle = '#000';
  const puffs: readonly (readonly [number, number, number])[] = [
    [62, 150, 48],
    [110, 108, 58],
    [170, 96, 60],
    [228, 118, 52],
    [250, 168, 42],
    [204, 196, 46],
    [140, 200, 50],
    [84, 192, 42],
  ];
  for (const [x, y, r] of puffs) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  // A wide ellipse ties the puffs together into one silhouette.
  ctx.beginPath();
  ctx.ellipse(156, 152, 104, 58, 0, 0, TAU);
  ctx.fill();

  const { data } = ctx.getImageData(0, 0, size, size);
  const on = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < size && y < size && (data[(y * size + x) * 4 + 3] ?? 0) > 128;

  let sx = -1;
  let sy = -1;
  outer: for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (on(x, y)) {
        sx = x;
        sy = y;
        break outer;
      }
    }
  }

  const dirs: Point[] = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ];
  const pts: Point[] = [];
  let x = sx;
  let y = sy;
  let dir = 7;
  let guard = 0;
  do {
    pts.push([x, y]);
    let moved = false;
    for (let k = 0; k < 8; k++) {
      const nd = (dir + 6 + k) % 8;
      const nx = x + (dirs[nd]?.[0] ?? 0);
      const ny = y + (dirs[nd]?.[1] ?? 0);
      if (on(nx, ny)) {
        x = nx;
        y = ny;
        dir = nd;
        moved = true;
        break;
      }
    }
    if (!moved) {
      break;
    }
  } while ((x !== sx || y !== sy) && ++guard < 20000);

  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  for (const [px, py] of pts) {
    x0 = Math.min(x0, px);
    y0 = Math.min(y0, py);
    x1 = Math.max(x1, px);
    y1 = Math.max(y1, py);
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const sc = 2 / Math.max(x1 - x0, y1 - y0);
  const norm = (px: number, py: number): Point => [(px - cx) * sc, (py - cy) * sc];
  const tail: TrailBubble[] = (
    [
      [58, 252, 18],
      [30, 280, 11],
    ] as const
  ).map(([px, py, r]) => {
    const [nx, ny] = norm(px, py);
    return [nx, ny, r * sc];
  });

  // Thin the traced boundary: it produces far more points than the morph needs.
  return { poly: pts.filter((_, i) => i % 3 === 0).map(([px, py]) => norm(px, py)), tail };
}

/**
 * The About thought cloud's trailing bubbles.
 *
 * Populated by buildShapes(); the fallback keeps the type non-null so drawing
 * can never dereference undefined.
 */
let cloudTrailPoints: TrailBubble[] = [];

export type IconName = 'logo' | 'cloud' | 'page' | 'computer' | 'bubble';

/**
 * Resample a contour to exactly VERTICES evenly spaced points, clockwise,
 * starting from the point nearest straight up.
 *
 * Even spacing and a stable start index are what let two different outlines
 * morph without the shape appearing to rotate as it changes.
 */
export function resample(poly: readonly Point[]): Point[] {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i] as Point;
    const q = poly[(i + 1) % poly.length] as Point;
    area += p[0] * q[1] - q[0] * p[1];
  }
  const ordered = area < 0 ? [...poly].reverse() : poly;

  const lengths: number[] = [0];
  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i] as Point;
    const b = ordered[(i + 1) % ordered.length] as Point;
    lengths.push(lengths[i] as number + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = lengths[lengths.length - 1] as number;
  const out: Point[] = [];
  for (let k = 0, s = 0; k < VERTICES; k++) {
    const d = (k / VERTICES) * total;
    while ((lengths[s + 1] as number) < d) {
      s++;
    }
    const a = ordered[s] as Point;
    const b = ordered[(s + 1) % ordered.length] as Point;
    const span = (lengths[s + 1] as number) - (lengths[s] as number) || 1;
    const f = (d - (lengths[s] as number)) / span;
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }

  let best = 0;
  let bestDistance = 1e9;
  out.forEach(([x, y], i) => {
    // Bias against starting from the lower half, so the start stays on top.
    const d = Math.abs(Math.atan2(y, x) + Math.PI / 2) + (y > 0 ? 9 : 0);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return out.slice(best).concat(out.slice(0, best));
}

let shapes: Record<IconName, Point[]> | null = null;

/**
 * Build (once) the resampled outline for every icon.
 *
 * Requires a DOM canvas because the cloud is traced from pixels, so this must
 * not run during server rendering.
 */
export function buildShapes(): Record<IconName, Point[]> {
  if (shapes) {
    return shapes;
  }
  const cloud = traceCloud();
  cloudTrailPoints = cloud.tail;

  const icons: Record<IconName, readonly Point[]> = {
    logo: outline.poly as unknown as Point[],
    cloud: cloud.poly,
    page: [
      [-0.72, -1],
      [0.28, -1],
      [0.74, -0.54],
      [0.74, 1],
      [-0.72, 1],
    ],
    computer: roundRect(-1, -0.95, 1, 0.42, 0.14, [
      [0.2, 0.42],
      [0.2, 0.66],
      [0.58, 0.66],
      [0.58, 0.9],
      [-0.58, 0.9],
      [-0.58, 0.66],
      [-0.2, 0.66],
      [-0.2, 0.42],
    ]),
    bubble: roundRect(-1, -0.78, 1, 0.46, 0.34, [
      [-0.12, 0.46],
      [-0.6, 0.98],
      [-0.5, 0.46],
    ]),
  };

  shapes = {} as Record<IconName, Point[]>;
  for (const [name, poly] of Object.entries(icons) as [IconName, readonly Point[]][]) {
    shapes[name] = resample(poly);
  }
  return shapes;
}

export function cloudTrail(): TrailBubble[] {
  buildShapes();
  return cloudTrailPoints;
}

/** Width-to-height ratio of the logo artwork. */
export const LOGO_ASPECT = outline.aspect;