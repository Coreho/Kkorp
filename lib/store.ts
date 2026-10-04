/**
 * Shared client state for the site.
 *
 * The prototype couples its carousel, chat window, jelly swarm, panel scenes and
 * screensaver through `window.kkNav` / `window.kkHome` / `window.kkScreensaver`
 * plus five CustomEvents (`kk:chat`, `kk:count`, `kk:join`, `kk:spell`,
 * `kk:party`) dispatched on `document`. Those work only because the scripts load
 * in a fixed order and the listeners happen to be registered before the
 * dispatchers fire.
 *
 * React replaces load order with render order, so that coupling is replaced
 * here with a single store. Subscribing by key means a component only
 * re-renders for the slice it reads.
 */

import type { SwarmEffects } from './canvas/jelly/engine';

export type PanelId = 'about' | 'blog' | 'projects' | 'chat';

export const PANEL_ORDER: readonly PanelId[] = [
  'about',
  'blog',
  'projects',
  'chat',
] as const;

export const PANEL_TITLES: Record<PanelId, string> = {
  about: 'About',
  blog: 'Blog',
  projects: 'Projects',
  chat: 'The Lobby',
};

/** How long a `/spell WORD` caption stays up for everyone, in ms. */
export const SPELL_MS = 20_000;
/** How long the party caption stays up, in ms. */
export const PARTY_MS = 1_800;

export interface ChatLine {
  id: number;
  who: string;
  body: string;
  kind: 'chat' | 'system' | 'bot' | 'self';
}

export interface SiteState {
  /** True once the visitor has entered from the landing page. */
  entered: boolean;
  /** The slide currently centred, or null while the landing is showing. */
  current: PanelId | null;
  /** Screen name of the signed-on visitor, or null. */
  screenName: string | null;
  people: string[];
  lines: ChatLine[];
  /** Rotating About caption word; set by /spell for a short window. */
  spell: string | null;
  /**
   * The About panel's rotating caption, as HTML.
   *
   * Owned by the jelly engine, which rotates it every 9s and lets /spell and
   * greetings hold it. It is escaped in the engine before it gets here.
   */
  captionHtml: string;
  partyUntil: number;
  /** Bumped to replay the buzz animation on the sender's own window. */
  buzzNonce: number;
  /**
   * Registered by the Lobby's dot matrix so a new chat line can ripple it.
   * Null when the canvas engines are not mounted.
   */
  onChatMessage: (() => void) | null;
  /** Registered by the screensaver so `/screensaver` can start it. */
  startScreensaver: (() => void) | null;
  /**
   * Registered by the jelly swarm.
   *
   * The prototype coupled the chat to the swarm with five document-level
   * CustomEvents. The swarm's commands are exposed here instead, so `/spell`,
   * `/party`, the join greeting, the speaker name and the online count still
   * reach the front page. Null when the swarm is not mounted.
   */
  swarm: SwarmEffects | null;
}

export const initialState: SiteState = {
  entered: false,
  current: null,
  screenName: null,
  people: [],
  lines: [],
  spell: null,
  captionHtml: 'The logo up top takes you back to the start.',
  partyUntil: 0,
  buzzNonce: 0,
  onChatMessage: null,
  startScreensaver: null,
  swarm: null,
};

type Listener = (state: SiteState) => void;

let state: SiteState = initialState;
const listeners = new Set<Listener>();
let nextLineId = 1;

function emit() {
  for (const listener of listeners) {
    listener(state);
  }
}

/** Replace state with a partial update and notify subscribers. */
export function setState(patch: Partial<SiteState>): void {
  state = { ...state, ...patch };
  emit();
}

export function getState(): SiteState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Reset to the initial state. Used by tests and by the landing exit path. */
export function resetState(): void {
  state = initialState;
  nextLineId = 1;
  emit();
}

export function addLine(
  line: Omit<ChatLine, 'id'>,
): ChatLine {
  const created: ChatLine = { ...line, id: nextLineId++ };
  setState({ lines: [...state.lines, created] });
  return created;
}

/** Open the site: dock the header logo and centre the first slide. */
export function enter(): void {
  setState({ entered: true, current: state.current ?? 'about' });
}

/** Return to the landing page and collapse every panel. */
export function exit(): void {
  setState({ entered: false, current: null });
}

/** Centre a slide by id, clamped to the four panels. */
export function goTo(id: PanelId): void {
  setState({ current: id, entered: true });
}

/** Move by `step` relative to the current slide, staying inside the carousel. */
export function step(delta: number): void {
  const index = state.current ? PANEL_ORDER.indexOf(state.current) : 0;
  const next = Math.min(
    PANEL_ORDER.length - 1,
    Math.max(0, index + delta),
  );
  const target = PANEL_ORDER[next];
  if (target) {
    setState({ current: target, entered: true });
  }
}

/** True when the visitor has typed into a field, so arrows must not navigate. */
export function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest('input, textarea, [contenteditable="true"]') !== null
  );
}

/** localStorage key pinned by tests/smoke.spec.js. */
export const SCREEN_NAME_KEY = 'kk_sn';

export function readStoredScreenName(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(SCREEN_NAME_KEY);
  } catch {
    // Private browsing or a blocked origin; the visitor simply types a name.
    return null;
  }
}

export function writeStoredScreenName(name: string): void {
  try {
    window.localStorage.setItem(SCREEN_NAME_KEY, name);
  } catch {
    // Persistence is a convenience, never a requirement for sending messages.
  }
}