'use client';

import { useEffect, useRef } from 'react';
import { mountSwarm, type Swarm } from '@/lib/canvas/jelly/engine';
import { mountKonami } from '@/lib/canvas/konami';
import { setState } from '@/lib/store';

/**
 * Mounts the jelly swarm and connects it to the store.
 *
 * The prototype wired the swarm to the chat room through five document-level
 * CustomEvents (`kk:chat`, `kk:count`, `kk:join`, `kk:spell`, `kk:party`) that
 * were dispatched by one script and listened for by another, with no teardown.
 * Here the swarm is mounted once and torn down on unmount, and the couplings it
 * needs are read from the store instead.
 */
export function JellyLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const swarmRef = useRef<Swarm | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const panels = document.getElementById('panels');
    if (!canvas || !panels) {
      return;
    }

    const swarm = mountSwarm({
      canvas,
      panels,
      // Read live from the DOM through a getter so the engine always sees the
      // current state without the effect re-subscribing on every change.
      get landing() {
        return !document.getElementById('landing')?.classList.contains('gone');
      },
      get currentPanel() {
        return (
          document.querySelector<HTMLElement>('.panel.open')?.dataset['panel'] ??
          null
        );
      },
    });
    swarmRef.current = swarm;

    // Publish captions into the store so React renders them. Text is escaped by
    // the engine before it reaches here.
    swarm.effects.setCaptionSink((html) => setState({ captionHtml: html }));
    // Expose the swarm's commands so the chat and the Konami code can reach it
    // without a window global.
    setState({ swarm: swarm.effects });

    const stopKonami = mountKonami((caption) => swarm.effects.party(caption));

    return () => {
      stopKonami();
      swarm.dispose();
      swarmRef.current = null;
      setState({ swarm: null });
    };
  }, []);

  return (
    <canvas
      className="pixelfield"
      ref={canvasRef}
      aria-hidden="true"
      data-testid="jelly-canvas"
    />
  );
}