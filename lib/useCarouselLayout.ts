'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PanelId } from '@/lib/store';
import { PANEL_ORDER } from '@/lib/store';

/**
 * Carousel geometry, ported from the prototype's `layout()`.
 *
 * The original measured the stage and wrote `style.width`, `style.transform`,
 * `style.opacity`, `--peek` and three class names onto every panel on each
 * layout pass. The arithmetic is unchanged; the writes are now React props, so
 * there is no imperative style pass to keep in sync with the render.
 */
export interface PanelLayout {
  width: string;
  transformOrigin: string;
  transform: string;
  opacity: number;
  peek: boolean;
  peekL: boolean;
  peekR: boolean;
}

export interface CarouselLayout {
  stageWidth: number;
  /** `--peek`, the width of a peeking neighbour's vertical label. */
  peekPx: string;
  panels: Record<PanelId, PanelLayout>;
}

const PEEK_NARROW = 18;
const PEEK_WIDE_RATIO = 0.07;
const PEEK_WIDE_MAX = 110;
const GAP_NARROW = 8;
const GAP_WIDE = 16;
const NARROW_BREAKPOINT = 700;
const PEEKED_SCALE = 0.94;

function panelLayoutFor(
  distance: number,
  contentWidth: number,
  gap: number,
  peek: number,
): PanelLayout {
  const x =
    distance === 0
      ? peek + gap
      : distance < 0
        ? peek - contentWidth + (distance + 1) * (contentWidth + gap)
        : peek + gap + contentWidth + gap + (distance - 1) * (contentWidth + gap);
  return {
    width: `${contentWidth}px`,
    transformOrigin:
      distance < 0 ? '100% 50%' : distance > 0 ? '0% 50%' : '50% 50%',
    transform: `translate3d(${x}px, 0, 0) scale(${distance === 0 ? 1 : PEEKED_SCALE})`,
    opacity: Math.abs(distance) > 1 ? 0 : 1,
    peek: Math.abs(distance) === 1,
    peekL: distance === -1,
    peekR: distance === 1,
  };
}

/**
 * Measure the stage and derive every panel's geometry for the current slide.
 *
 * Falls back to the prototype's CSS values before the first measurement so the
 * server-rendered markup and the first client paint agree.
 */
export function useCarouselLayout(current: PanelId | null): {
  ref: (node: HTMLElement | null) => void;
  layout: CarouselLayout;
} {
  const nodeRef = useRef<HTMLElement | null>(null);
  const [stageWidth, setStageWidth] = useState(NARROW_BREAKPOINT + 1);

  // A stable callback ref, so consumers can depend on its identity without the
  // effect that uses it re-running on every render.
  const ref = useCallback((node: HTMLElement | null) => {
    nodeRef.current = node;
  }, []);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) {
      return;
    }
    const measure = () => {
      setStageWidth(node.getBoundingClientRect().width);
    };
    measure();
    // The prototype used a bare `resize` listener plus two ResizeObservers for
    // the panel scenes. One observer on the stage covers the width changes that
    // the carousel geometry actually depends on, and it disconnects on unmount.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  const narrow = stageWidth < NARROW_BREAKPOINT;
  const peek = narrow ? PEEK_NARROW : Math.min(PEEK_WIDE_MAX, stageWidth * PEEK_WIDE_RATIO);
  const gap = narrow ? GAP_NARROW : GAP_WIDE;
  const contentWidth = stageWidth - 2 * (peek + gap);
  const currentIndex = current ? PANEL_ORDER.indexOf(current) : 0;

  const panels = {} as Record<PanelId, PanelLayout>;
  PANEL_ORDER.forEach((id, index) => {
    panels[id] = panelLayoutFor(index - currentIndex, contentWidth, gap, peek);
  });

  return { ref, layout: { stageWidth, peekPx: `${peek}px`, panels } };
}