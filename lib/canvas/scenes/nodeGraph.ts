'use client';

import { applyFont, sansStack } from '../fonts';
import type { PanelScene, SceneState } from '../types';

/**
 * The Projects panel's background: a draggable node graph.
 *
 * Nodes repel each other, drift toward a centre line, and pass small packets
 * along the edges. Clicking empty space adds a node, capped at 30.
 *
 * Ported from the prototype's `graph` scene. The physics constants are
 * unchanged. Labels are the only place the prototype hard-coded a font name, so
 * that is resolved through next/font like everything else.
 */

const INK = 'rgba(244, 244, 245, ';
const INITIAL_NODES = 16;
const MAX_NODES = 30;
const EXTRA_EDGES = 5;
const GRAB_RADIUS = 26;
const HOVER_RADIUS = 26;
const REPEL_RADIUS = 80;
const PACKET_SPEED = 0.00035;
/** Two wall hits within this window count as a corner. */
const CORNER_WINDOW = 90;

const LABELS = [
  'Next.js',
  'Supabase',
  'Vercel',
  'Chat',
  'Bots',
  'Blog',
  'Admin',
] as const;

interface GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  label: string | null;
  /** Timestamp the node appeared, for the pop-in, or 0 for seeded nodes. */
  born: number;
}

interface GraphEdge {
  a: GraphNode;
  b: GraphNode;
  ph: number;
}

export function createNodeGraphScene(): PanelScene {
  let width = 0;
  let height = 0;
  const nodes: GraphNode[] = [];
  let edges: GraphEdge[] = [];
  let grabbed: GraphNode | null = null;
  let hitNode = false;

  const node = (
    x: number,
    y: number,
    label: string | null,
    born: number,
  ): GraphNode => ({ x, y, vx: 0, vy: 0, label, born });

  const edge = (a: GraphNode, b: GraphNode): GraphEdge => ({
    a,
    b,
    ph: Math.random(),
  });

  const nearest = (x: number, y: number, r: number): GraphNode | null => {
    let best: GraphNode | null = null;
    let bestDistance = r;
    for (const n of nodes) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bestDistance) {
        bestDistance = d;
        best = n;
      }
    }
    return best;
  };

  return {
    resize(state) {
      width = state.width;
      height = state.height;
      if (nodes.length) {
        return;
      }
      for (let k = 0; k < INITIAL_NODES; k++) {
        nodes.push(
          node(
            width / 2 + (Math.random() - 0.5) * width * 0.7,
            height * 0.68 + (Math.random() - 0.5) * height * 0.3,
            LABELS[k] ?? null,
            0,
          ),
        );
      }
      for (let k = 1; k < INITIAL_NODES; k++) {
        const a = nodes[k];
        if (a) {
          edges.push(edge(a, nodes[Math.floor(Math.random() * k)] as GraphNode));
        }
      }
      for (let k = 0; k < EXTRA_EDGES; k++) {
        const a = Math.floor(Math.random() * INITIAL_NODES);
        const b = Math.floor(Math.random() * INITIAL_NODES);
        if (a !== b) {
          edges.push(edge(nodes[a] as GraphNode, nodes[b] as GraphNode));
        }
      }
    },

    down(state) {
      grabbed = nearest(state.pointerX, state.pointerY, GRAB_RADIUS);
      hitNode = grabbed !== null;
    },

    up() {
      grabbed = null;
    },

    tap(state, t) {
      // Tapping a node or the top strip does nothing; only empty space adds one.
      if (hitNode || state.pointerY < height * 0.4) {
        return;
      }
      const created = node(state.pointerX, state.pointerY, null, t);
      const near = [...nodes]
        .sort(
          (p, q) =>
            Math.hypot(p.x - created.x, p.y - created.y) -
            Math.hypot(q.x - created.x, q.y - created.y),
        )
        .slice(0, 2);
      nodes.push(created);
      for (const other of near) {
        edges.push(edge(created, other));
      }
      if (nodes.length > MAX_NODES) {
        // Drop an unlabelled node so the seeded labels survive.
        const oldest = nodes.find((n) => !n.label);
        if (oldest) {
          nodes.splice(nodes.indexOf(oldest), 1);
          edges = edges.filter((e) => e.a !== oldest && e.b !== oldest);
        }
      }
    },

    draw(ctx, _state, t) {
      if (!width || !height) {
        return;
      }
      const centreX = width / 2;
      const centreY = height * 0.68;
      const top = height * 0.44;
      const bottom = height - 80;

      // Node repulsion, gentle pull to the centre line, and pointer avoidance.
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i] as GraphNode;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j] as GraphNode;
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          const d2 = Math.max(100, dx * dx + dy * dy);
          const f = 900 / d2;
          const d = Math.sqrt(d2);
          dx /= d;
          dy /= d;
          a.vx += dx * f;
          a.vy += dy * f;
          b.vx -= dx * f;
          b.vy -= dy * f;
        }
        a.vx += (centreX - a.x) * 0.0015 + Math.sin(t * 0.001 + i) * 0.02;
        a.vy += (centreY - a.y) * 0.0015 + Math.cos(t * 0.0012 + i) * 0.02;
        if (_state.inside && !grabbed) {
          const d = Math.hypot(a.x - _state.pointerX, a.y - _state.pointerY);
          if (d < REPEL_RADIUS && d > 0) {
            a.vx += ((a.x - _state.pointerX) / d) * (1 - d / REPEL_RADIUS) * 0.8;
            a.vy += ((a.y - _state.pointerY) / d) * (1 - d / REPEL_RADIUS) * 0.8;
          }
        }
      }

      // Edges pull their endpoints to a resting length.
      for (const e of edges) {
        const dx = e.b.x - e.a.x;
        const dy = e.b.y - e.a.y;
        const d = Math.hypot(dx, dy) || 1;
        const f = (d - 64) * 0.01;
        e.a.vx += (dx / d) * f;
        e.a.vy += (dy / d) * f;
        e.b.vx -= (dx / d) * f;
        e.b.vy -= (dy / d) * f;
      }

      for (const n of nodes) {
        if (n === grabbed) {
          n.x = _state.pointerX;
          n.y = _state.pointerY;
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.vx *= 0.86;
        n.vy *= 0.86;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.min(width - 20, Math.max(20, n.x));
        n.y = Math.min(bottom, Math.max(top, n.y));
      }

      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 1;
      ctx.strokeStyle = `${INK}.32)`;
      ctx.beginPath();
      for (const e of edges) {
        ctx.moveTo(e.a.x, e.a.y);
        ctx.lineTo(e.b.x, e.b.y);
      }
      ctx.stroke();

      // Packets travelling along the edges.
      ctx.fillStyle = `${INK}.85)`;
      for (const e of edges) {
        const p = (t * PACKET_SPEED + e.ph) % 1;
        ctx.fillRect(
          e.a.x + (e.b.x - e.a.x) * p - 1.5,
          e.a.y + (e.b.y - e.a.y) * p - 1.5,
          3,
          3,
        );
      }

      const fontOk = applyFont(ctx, '500', 11, sansStack());
      ctx.textBaseline = 'middle';

      for (const n of nodes) {
        const pop = n.born ? Math.min(1, (t - n.born) / 300) : 1;
        const hot =
          n === grabbed ||
          (_state.inside &&
            Math.hypot(n.x - _state.pointerX, n.y - _state.pointerY) <
              HOVER_RADIUS);

        if (n.label) {
          const textWidth = fontOk
            ? ctx.measureText(n.label).width
            : n.label.length * 6.5;
          const w = textWidth + 14;
          ctx.fillStyle = hot ? '#4b4ba0' : '#0c0c12';
          ctx.fillRect(n.x - w / 2, n.y - 10, w, 20);
          ctx.strokeStyle = `${INK}.7)`;
          ctx.strokeRect(n.x - w / 2 + 0.5, n.y - 9.5, w - 1, 19);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(n.label, n.x - w / 2 + 7, n.y + 0.5);
        } else {
          ctx.beginPath();
          ctx.arc(n.x, n.y, (hot ? 6 : 4) * pop, 0, Math.PI * 2);
          ctx.fillStyle = hot ? '#4b4ba0' : '#0c0c12';
          ctx.fill();
          ctx.strokeStyle = `${INK}.8)`;
          ctx.stroke();
        }
      }
    },
  };
}