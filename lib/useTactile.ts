'use client';

/**
 * Tactility for the visible layer: panels that lean, controls that are magnetic,
 * and a nav pill that travels with follow-through.
 *
 * Everything here is deliberately pointer-only. AC#2 requires that a coarse
 * pointer, a device with no fine pointer, or a keyboard-only visitor sees
 * nothing move, so `fine` gates whether a single `pointermove` listener is
 * attached at all, rather than filtering its results. Likewise AC#3 requires
 * reduced motion to stop the movement, so `reduced` skips the frame loop
 * entirely and writes the resting values once.
 *
 * Four choices carry the weight:
 *
 * - One `requestAnimationFrame` loop drives every channel. Each channel owns a
 *   single scalar, because a channel that carried two values would have had to
 *   write one of them from the other's velocity.
 * - Panel geometry comes from the carousel's own arithmetic, not from
 *   `getBoundingClientRect`. A tilted panel's rect includes its own tilt, so
 *   measuring it would feed the tilt back into its input and let it drift. The
 *   stage is never transformed, so one cached stage rect plus each slide's `x`
 *   and `widthPx` gives every panel's true resting centre.
 * - Resting boxes for the magnetic controls are cached while everything is
 *   still un-displaced, so the pull is always computed from a control's true rest
 *   position instead of from a box this effect has already moved.
 * - The long `transform` transition that smooths slide changes is scoped to
 *   `#panels[data-moving]` in the stylesheet. Left on `.panel` it would also
 *   apply to the tilt and arrive 600ms late, which reads as broken rather than
 *   soft.
 */

import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { CarouselLayout } from './useCarouselLayout';
import type { PanelId } from './store';
import { PANEL_ORDER } from './store';
import {
  addChannel,
  clamp,
  hasFinePointer,
  onPointerTypeChange,
  onReducedMotion,
  reducedMotion,
  stopAll,
  wake,
  type Channel,
} from './tactile';

/** Nav items and the chat window's own buttons are the magnetic controls. */
const MAGNETIC = '#cnav button, .bevel';

/** Degrees of lean for the open panel, and for a peeking neighbour. */
const TILT_OPEN = 3.2;
const TILT_PEEK = 1.6;
/** How far the panel's content slides against the lean, in px. */
const SHIFT_MAX = 7;

/** Magnetic controls drift toward the pointer inside this radius. */
const MAGNET_RADIUS = 96;
const MAGNET_PULL = 0.3;
const MAGNET_MAX = 7;

const PILL_TAU = 0.1;
const SQUASH_MAX = 0.18;
const SQUASH_PER_PX = 0.0016;

const TILT_TAU = 0.13;
const MAGNET_TAU = 0.1;

/** Vertical slop, so a pointer just outside a panel still nudges it. */
const NEAR_PX = 40;

interface Scalar {
  channel: Channel;
  set(value: number): void;
}

/**
 * One scalar on one custom property, driven by the shared frame loop.
 *
 * `unit` is not decoration. The values land in CSS declarations that consume
 * them, and a unitless non-zero number is not a valid `<angle>` or `<length>`:
 * `rotateX(1.991)` makes the whole `transform` invalid at computed-value time,
 * which resolves to `none` and drops the carousel along with the tilt. A
 * unitless `0` happens to be accepted, so this only breaks the moment the
 * pointer moves, which is exactly the kind of fault a resting-state check
 * passes straight over.
 */
function scalar(
  node: HTMLElement,
  property: string,
  unit: string,
  tau: number,
  epsilon: number,
  after?: (value: number, velocity: number) => void,
): Scalar {
  const channel: Channel = {
    target: 0,
    value: 0,
    velocity: 0,
    tau,
    epsilon,
    write(value, velocity) {
      node.style.setProperty(property, `${value.toFixed(3)}${unit}`);
      after?.(value, velocity);
    },
  };
  return {
    channel,
    set(next) {
      if (channel.target === next) {
        return;
      }
      channel.target = next;
      wake();
    },
  };
}

/** The four values one panel needs: two lean angles and two content offsets. */
interface PanelHandles {
  tiltX: Scalar;
  tiltY: Scalar;
  shiftX: Scalar;
  shiftY: Scalar;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Both media queries are read through `useSyncExternalStore` rather than into
 * state from an effect.
 *
 * They are external stores that can change at any moment, which is exactly what
 * that hook is for, and it avoids the cascading render an effect plus setState
 * would cause. The server snapshot is `false` for both: a machine with no stated
 * pointer or motion preference is the safe assumption to render, and it matches
 * what the client reads on the overwhelming majority of visits.
 */
const serverFalse = () => false;

export function useTactile(
  layout: CarouselLayout,
  current: PanelId | null,
  active: boolean,
): void {
  const fine = useSyncExternalStore(
    (listener) => onPointerTypeChange(listener),
    hasFinePointer,
    serverFalse,
  );
  const reduced = useSyncExternalStore(
    (listener) => onReducedMotion(listener),
    reducedMotion,
    serverFalse,
  );

  // Read inside listeners so the effect is not rebuilt on every render, because
  // `layout` is rebuilt on every render by design. Updated in an effect rather
  // than during render; a pointer event can therefore read a layout that is one
  // commit old, which is under a frame and invisible in a 3-degree lean.
  const layoutRef = useRef(layout);
  useEffect(() => {
    layoutRef.current = layout;
  });

  // Lets the navigation effect re-place the pill without tearing the channels
  // down, which would restart the pill from zero.
  const onNavigateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }
    // Captured as a typed local so the hoisted helpers below keep the narrowing
    // from the null check, which a function declaration does not inherit.
    const stageNode = document.getElementById('panels');
    if (!stageNode) {
      return;
    }
    const stage: HTMLElement = stageNode;

    const nav = document.getElementById('cnav');
    const panelNodes = new Map<PanelId, HTMLElement>();
    for (const id of PANEL_ORDER) {
      const node = stage.querySelector<HTMLElement>(`.panel[data-panel="${id}"]`);
      if (node) {
        panelNodes.set(id, node);
      }
    }

    const magnetNodes = [...document.querySelectorAll<HTMLElement>(MAGNETIC)];
    const restRects = new WeakMap<HTMLElement, Rect>();
    const disposers: (() => void)[] = [];

    let pillChannel: Channel | null = null;

    /**
     * Park the pill on the active item, or travel there.
     *
     * Both paths set the width first, because the pill's squash is computed from
     * its own speed and its travel is meaningless until it has a size.
     */
    function placePill(animate: boolean): void {
      if (!nav) {
        return;
      }
      const item = nav.querySelector<HTMLElement>('button[aria-current="true"]');
      // A hidden nav has no layout boxes, so there is nothing to measure.
      if (!item || nav.hasAttribute('hidden')) {
        return;
      }
      const offset = item.offsetLeft - 6;
      nav.style.setProperty('--pill-w', `${item.offsetWidth}px`);
      // The highlight only moves to the pill once the pill has a real width, so
      // the active item is never left unpainted and the pill never flashes at
      // zero size on first paint.
      nav.dataset.pill = 'ready';
      if (animate && pillChannel) {
        pillChannel.target = offset;
        wake();
      } else {
        nav.style.setProperty('--pill-x', `${offset.toFixed(2)}px`);
        nav.style.setProperty('--pill-sx', '1');
        if (pillChannel) {
          pillChannel.value = offset;
          pillChannel.velocity = 0;
        }
      }
    }

    /** Cache every resting box and measurement while nothing is displaced. */
    function cacheRest(): void {
      measureStage();
      for (const node of magnetNodes) {
        const box = node.getBoundingClientRect();
        restRects.set(node, {
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
        });
      }
      placePill(false);
    }

    /** Write every resting value once, with no loop and no listeners. */
    function writeResting(): void {
      for (const node of panelNodes.values()) {
        node.style.removeProperty('--tilt-x');
        node.style.removeProperty('--tilt-y');
        node.style.removeProperty('--tilt-shift-x');
        node.style.removeProperty('--tilt-shift-y');
      }
      for (const node of magnetNodes) {
        node.style.removeProperty('--magnet-x');
        node.style.removeProperty('--magnet-y');
      }
      if (nav) {
        delete nav.dataset.pill;
      }
      placePill(false);
    }

    // AC#2 and AC#3: with a coarse pointer or reduced motion nothing is wired up
    // at all. The site stays fully operable; it simply does not move.
    if (reduced || !fine) {
      // The pill still has to say which section is showing, because that is
      // navigation state rather than decoration. It arrives instead of
      // travelling. Without this the highlight would stay on the first section
      // for the whole visit.
      onNavigateRef.current = () => placePill(false);
      writeResting();
      return;
    }

    let stageRect: Rect = { left: 0, top: 0, width: 0, height: 0 };
    function measureStage(): void {
      const box = stage.getBoundingClientRect();
      stageRect = {
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      };
    }
    measureStage();

    const panels = new Map<PanelId, PanelHandles>();
    for (const [id, node] of panelNodes) {
      panels.set(id, {
        tiltX: scalar(node, '--tilt-x', 'deg', TILT_TAU, 0.004),
        tiltY: scalar(node, '--tilt-y', 'deg', TILT_TAU, 0.004),
        shiftX: scalar(node, '--tilt-shift-x', 'px', TILT_TAU, 0.05),
        shiftY: scalar(node, '--tilt-shift-y', 'px', TILT_TAU, 0.05),
      });
    }
    const magnets = new Map<HTMLElement, { x: Scalar; y: Scalar }>();
    for (const node of magnetNodes) {
      magnets.set(node, {
        x: scalar(node, '--magnet-x', 'px', MAGNET_TAU, 0.05),
        y: scalar(node, '--magnet-y', 'px', MAGNET_TAU, 0.05),
      });
    }

    for (const handles of panels.values()) {
      for (const key of ['tiltX', 'tiltY', 'shiftX', 'shiftY'] as const) {
        disposers.push(addChannel(handles[key].channel));
      }
    }
    for (const handles of magnets.values()) {
      disposers.push(addChannel(handles.x.channel));
      disposers.push(addChannel(handles.y.channel));
    }

    if (nav) {
      pillChannel = {
        target: 0,
        value: 0,
        velocity: 0,
        tau: PILL_TAU,
        epsilon: 0.05,
        write(value, velocity) {
          nav.style.setProperty('--pill-x', `${value.toFixed(2)}px`);
          // Squashing by the pill's own speed is what makes it decelerate into
          // place instead of sliding at a constant rate and stopping dead.
          const squash =
            1 - Math.min(SQUASH_MAX, Math.abs(velocity) * SQUASH_PER_PX);
          nav.style.setProperty('--pill-sx', squash.toFixed(4));
        },
      };
      disposers.push(addChannel(pillChannel));
    }

    cacheRest();

    const onPointerMove = (event: PointerEvent) => {
      const px = event.clientX;
      const py = event.clientY;
      const now = layoutRef.current;

      for (const [id, handles] of panels) {
        const panel = now.panels[id];
        if (!panel) {
          continue;
        }
        const halfW = panel.widthPx / 2;
        const halfH = stageRect.height / 2;
        const centreX = stageRect.left + panel.x + halfW;
        const centreY = stageRect.top + halfH;
        const nx = clamp((px - centreX) / halfW, -1, 1);
        const ny = clamp((py - centreY) / halfH, -1, 1);
        // Slop, so a pointer parked in the nav does not leave the last panel
        // leaning, and a pointer just off the panel still nudges it.
        const near =
          px > centreX - halfW - NEAR_PX &&
          px < centreX + halfW + NEAR_PX &&
          py > centreY - halfH - NEAR_PX &&
          py < centreY + halfH + NEAR_PX;

        if (!near) {
          handles.tiltX.set(0);
          handles.tiltY.set(0);
          handles.shiftX.set(0);
          handles.shiftY.set(0);
          continue;
        }

        // A slide more than one step away is off-stage and holds still.
        const visible = panel.opacity > 0;
        const open = visible && !panel.peek;
        const magnitude = open ? TILT_OPEN : TILT_PEEK;
        // A peeking neighbour leans away from the stage centre instead of
        // chasing the pointer, so the carousel reads as a receding row.
        const away = panel.peekL ? -1 : panel.peekR ? 1 : 0;
        const dirX = open ? nx : away;
        const dirY = open ? ny : 0;

        // rotateX answers the vertical offset and rotateY the horizontal one.
        // Positive rotateY turns the panel's right edge away from the viewer, so
        // both are negated to bring the near edge forward.
        handles.tiltX.set(-dirY * magnitude);
        handles.tiltY.set(-dirX * magnitude);
        handles.shiftX.set(dirX * SHIFT_MAX);
        handles.shiftY.set(dirY * SHIFT_MAX);
      }

      for (const [node, handles] of magnets) {
        const rect = restRects.get(node);
        if (!rect) {
          continue;
        }
        const dx = px - (rect.left + rect.width / 2);
        const dy = py - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy);
        if (distance > MAGNET_RADIUS) {
          handles.x.set(0);
          handles.y.set(0);
          continue;
        }
        // Falls off to nothing at the edge of the radius, so the pull has no
        // visible boundary.
        const falloff = 1 - distance / MAGNET_RADIUS;
        const pull = falloff * falloff * MAGNET_PULL;
        handles.x.set(clamp(dx * pull, -MAGNET_MAX, MAGNET_MAX));
        handles.y.set(clamp(dy * pull, -MAGNET_MAX, MAGNET_MAX));
      }
    };

    const onLeave = () => {
      for (const handles of magnets.values()) {
        handles.x.set(0);
        handles.y.set(0);
      }
    };

    const onResize = () => {
      cacheRest();
    };

    const onNavigate = () => {
      // Re-cache first, because opening the chat window moves the buttons that
      // the magnetic pull is measured against, then let the pill travel.
      measureStage();
      for (const node of magnetNodes) {
        const box = node.getBoundingClientRect();
        restRects.set(node, {
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
        });
      }
      placePill(true);
    };
    onNavigateRef.current = onNavigate;

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', onResize);
      onNavigateRef.current = null;
      for (const dispose of disposers) {
        dispose();
      }
      stopAll();
      // Leave no inline custom properties behind, so a later keyboard-only or
      // reduced-motion visit starts from the stylesheet rather than from
      // whatever the pointer happened to leave on the way out.
      writeResting();
    };
    // `layout` is read through a ref. Navigation re-measures through
    // `onNavigateRef` instead of rebuilding the channels, which would restart
    // the pill from zero.
  }, [active, fine, reduced, layout.stageWidth]);

  // Fires when the section actually changes, not on every render: an effect with
  // no dependency list would snap the pill to its destination on every render
  // and cancel the travel it is supposed to animate.
  useEffect(() => {
    onNavigateRef.current?.();
  }, [current]);
}
