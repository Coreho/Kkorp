'use client';

import { useEffect, useRef } from 'react';
import { mountScene } from '@/lib/canvas/mountScene';
import { createBlogPageScene } from '@/lib/canvas/scenes/blogPage';
import { createNodeGraphScene } from '@/lib/canvas/scenes/nodeGraph';
import { mountDotfield } from '@/lib/canvas/engines/dotfield';
import type { ChatDots } from '@/lib/canvas/engines/chatDots';
import { mountChatDots } from '@/lib/canvas/engines/chatDots';
import { mountScreensaver } from '@/lib/canvas/engines/screensaver';
import { setState } from '@/lib/store';

/**
 * The full-bleed dot-matrix field behind everything.
 *
 * The canvas lives in React markup and the engine is mounted against it, so the
 * element and its lifetime are owned in one place. The prototype created this
 * canvas at script load and never released its animation frame or resize
 * listener.
 */
export function Dotfield() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    return mountDotfield(ref.current);
  }, []);

  return (
    <canvas className="dotfield" id="dotfield" aria-hidden="true" ref={ref} />
  );
}

/**
 * The Blog and Projects panel scenes.
 *
 * Both canvases are prepended into their panels by the scene itself, because the
 * prototype positioned them by insertion order rather than by CSS.
 */
export function PanelScenes() {
  useEffect(() => {
    const disposers: (() => void)[] = [];
    const blog = document.querySelector<HTMLElement>('.p2');
    if (blog) {
      disposers.push(mountScene(blog, createBlogPageScene()));
    }
    const projects = document.querySelector<HTMLElement>('.p3');
    if (projects) {
      disposers.push(mountScene(projects, createNodeGraphScene()));
    }
    return () => {
      for (const dispose of disposers) {
        dispose();
      }
    };
  }, []);

  return null;
}

/**
 * Mounts the Lobby's dot matrix against the canvas already in the panel markup,
 * and publishes its ripple trigger into the store so a new chat line can fire it.
 */
export function ChatDotsMount({ canvas }: { canvas: HTMLCanvasElement | null }) {
  useEffect(() => {
    const panel = document.querySelector<HTMLElement>('.p4');
    if (!canvas || !panel) {
      return;
    }
    const dots: ChatDots = mountChatDots(canvas, panel);
    setState({ onChatMessage: dots.pulse });
    return () => {
      dots.dispose();
      setState({ onChatMessage: null });
    };
  }, [canvas]);

  return null;
}

/**
 * The idle screensaver.
 *
 * Renders its own overlay and mounts the engine against it, and publishes a
 * starter so the chat's `/screensaver` command can trigger it without reaching
 * for a window global.
 */
export function ScreensaverOverlay() {
  const container = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const corners = useRef<HTMLElement | null>(null);
  const flash = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!container.current || !canvas.current || !corners.current || !flash.current) {
      return;
    }
    const saver = mountScreensaver({
      container: container.current,
      canvas: canvas.current,
      cornersEl: corners.current,
      flashEl: flash.current,
    });
    setState({ startScreensaver: saver.start });
    return () => {
      saver.dispose();
      setState({ startScreensaver: null });
    };
  }, []);

  return (
    <div className="saver" id="saver" ref={container} hidden>
      <canvas id="saverCanvas" aria-hidden="true" ref={canvas} />
      <p className="saver-hint">
        KoreoKorp is resting. Move the mouse or press a key to wake it. · Corners
        hit: <b id="corners" ref={corners}>
          0
        </b>
      </p>
      <p className="saver-corner" id="cornerFlash" aria-live="polite" ref={flash} />
    </div>
  );
}