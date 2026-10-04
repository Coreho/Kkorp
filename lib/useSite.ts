'use client';

import { useSyncExternalStore } from 'react';
import { getState, subscribe } from './store';

/**
 * Subscribe a component to the whole site state.
 *
 * The prototype's carousel, chat, swarm and scenes were wired together with
 * window globals and document-level CustomEvents. They are all reading from
 * this one store now, so a single hook replaces that bus.
 */
export function useSite() {
  return useSyncExternalStore(subscribe, getState, getState);
}