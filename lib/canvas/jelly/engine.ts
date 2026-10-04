/**
 * The jelly swarm.
 *
 * Two shapes share one full-viewport canvas:
 *
 *  - `logo` is the KoreoKorp mark. On the landing it sits large and centred;
 *    entering the site glides it up to dock as the small header logo.
 *  - `pop` leaves the docked logo and flies to whichever slide is open,
 *    morphing into that slide's icon (thought cloud, page, computer, speech
 *    bubble). Closing the slide pulls it back in.
 *
 * Both are solid jelly silhouettes while they move and gain their artwork once
 * they settle. Every frame is time-based, so behaviour does not change with
 * refresh rate.
 *
 * The prototype ran this as a self-executing IIFE with a `requestAnimationFrame`
 * that could never be cancelled and a `resize` listener that was never removed.
 * Here it is an explicit `mount()` that returns `dispose()`, which is the
 * contract AGENTS.md requires.
 */
import {
  buildShapes,
  cloudTrail,
  LOGO_ASPECT,
  type IconName,
  type Point,
} from './shapes';
import { makeBlob, rgbStr, type Blob, type Placement } from './blob';
import { fontsReady } from '../fonts';
import { onReducedMotionChange, prefersReducedMotion } from '../motion';

const TAU = Math.PI * 2;

/**
 * Emitted by the bundler from assets/koreokorp-logo-cutout.webp.
 * Kept beside the code that draws it so the two cannot drift apart.
 */
const logoUrl = new URL(
  '../../../assets/koreokorp-logo-cutout.webp',
  import.meta.url,
);

const CAPTION_CYCLE_MS = 9000;
const PARTICLE_FLIGHT_MS = 900;
const PARTICLE_LIFETIME = 1.25;
const FRAME_MS = 1000 / 60;
const MAX_DT_FRAMES = 3;
const MIN_DT_FRAMES = 0.25;
const SPELL_HOLD_MS = 20_000;
const PARTY_SPIN_MS = 6000;
const PARTY_FALL_MS = 4200;
const SPEAK_HOLD_MS = 12_000;
const SPELL_HOLD = 20_000;
const PARTY_CAPTION_DELAY = 1800;
const PARTY_CAPTION_HOLD_MS = 9000;

export interface SwarmHost {
  /** The canvas to draw into. Owned by the caller. */
  canvas: HTMLCanvasElement;
  /** The element containing the carousel panels. */
  panels: HTMLElement;
  /** True while the landing page is showing. */
  landing: boolean;
  /** The open slide's id, or null when nothing is open. */
  currentPanel: string | null;
}

export interface SwarmEffects {
  /** Splash the logo, e.g. on entering or leaving the site. */
  splash(force: number): void;
  /**
   * Send a droplet from the logo to the newest message.
   *
   * The target lookup lives here rather than in the chat, because only the
   * engine knows the canvas geometry the droplet starts from.
   */
  sendDropletToLatest(): void;
  /** Hold a caption for a while and bounce the logo. */
  holdCaption(html: string, holdMs: number): void;
  /** Party: rainbow spin, falling, then a caption. */
  party(captionHtml: string): void;
  /** Who spoke last, for the rotating caption. */
  setSpeaker(name: string): void;
  /** How many people are in the room, for the rotating caption. */
  setOnline(count: number): void;
  /** `/spell WORD`: put a word on the front page for everyone. */
  setSpell(raw: string): void;
  /** Cycle to the next caption in the rotation. */
  rotateCaption(): void;
  /**
   * Register the sink that receives caption HTML.
   *
   * The engine owns caption rotation but not rendering, so the React layer
   * supplies where captions go.
   */
  setCaptionSink(sink: (html: string) => void): void;
}

export interface Swarm {
  effects: SwarmEffects;
  dispose(): void;
}

/** Escape text destined for a caption that is inserted as HTML. */
function esc(value: string): string {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c] as string,
  );
}

interface Droplet {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t0: number;
  rgb: readonly [number, number, number];
}

const ease = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

export function mountSwarm(host: SwarmHost): Swarm {
  const { canvas, panels } = host;
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) {
    throw new Error('2D canvas context unavailable; the jelly swarm cannot run');
  }
  // Bound to a new const so the non-null narrowing survives into the closures
  // below; TypeScript does not carry narrowing of a captured binding inward.
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let shapes = buildShapes();
  let tail = cloudTrail();

  // The logo artwork is drawn over the silhouette once a shape settles. It is
  // loaded from assets/ — the same file the prototype inlined as base64 — so
  // the bundler emits it and the repository keeps a single copy. The
  // new URL form is what makes the asset bundler pick it up.
  const logo = new Image();
  logo.decoding = 'async';
  logo.src = logoUrl.href;

  let vw = 0;
  let vh = 0;
  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  window.addEventListener('resize', fit);

  let logoBlob = makeBlob(vw / 2, vh / 2);
  const pop = makeBlob(vw / 2, vh / 2);
  logoBlob.breathe = true;

  // Caption rotation state. Live entries are filled in from the chat room.
  const state = {
    index: 0,
    holdUntil: 0,
    partyUntil: 0,
    lastInteract: 0,
    speaker: 'Y2Kpixie',
    online: 5,
  };

  let droplets: Droplet[] = [];
  /** Set by the React layer; captions are published into the store from there. */
  let captionSink: (html: string) => void = () => {};
  let lastT = 0;
  let primed = false;
  let frame = 0;
  let disposed = false;
  const reduced = () => prefersReducedMotion();

  const captionFor = (index: number): string => {
    switch (index) {
      case 0:
        return 'The logo up top takes you back to the start.';
      case 1:
        return `<b>${esc(state.speaker)}</b> spoke last in The Lobby`;
      case 2:
        return `<b>${esc(String(state.online))}</b> people in The Lobby right now`;
      case 3:
        return 'The chat room is always open. Say hi.';
      case 4:
        return 'A/S/L? Please don’t actually answer that.';
      default:
        return 'BRB energy. Away messages are back.';
    }
  };

  const logoWidth = () =>
    host.landing ? Math.min(972, vw * 0.86) : Math.min(162, vw * 0.42);

  function logoPlacement(): Placement {
    const w = logoWidth();
    return host.landing
      ? { icon: 'logo', rgb: [31, 111, 229], x: vw / 2, y: vh * 0.44, size: w }
      : {
          icon: 'logo',
          rgb: [31, 111, 229],
          x: vw / 2,
          y: 16 + (w * LOGO_ASPECT) / 2,
          size: w,
        };
  }

  function popPlacement(): Placement {
    const open = panels.querySelector<HTMLElement>('.panel.open');
    const name = open?.dataset['panel'] ?? null;

    const box = (el: HTMLElement, b: readonly [number, number, number, number]) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left + (r.width * (b[0] + b[2])) / 2,
        y: r.top + (r.height * (b[1] + b[3])) / 2,
        size: Math.min(r.width * (b[2] - b[0]), r.height * (b[3] - b[1])),
      };
    };

    if (!host.landing && name === 'chat') {
      const aim = panels.querySelector<HTMLElement>('.aim');
      if (aim) {
        const r = aim.getBoundingClientRect();
        const size = 96;
        return {
          icon: 'bubble',
          rgb: [255, 63, 191],
          x: Math.max(size / 2 + 8, r.left + 18),
          y: Math.max(size / 2 + 8, r.top - 30),
          size,
        };
      }
    }
    if (!host.landing && open && name === 'about') {
      return {
        icon: 'cloud',
        rgb: [124, 108, 255],
        ...box(open, vw < 700 ? [0.6, 0.07, 0.98, 0.19] : [0.58, 0.34, 0.95, 0.8]),
      };
    }
    if (!host.landing && open && name === 'blog') {
      return {
        icon: 'page',
        rgb: [75, 75, 160],
        ...box(open, vw < 700 ? [0.72, 0.05, 0.94, 0.19] : [0.62, 0.07, 0.9, 0.31]),
      };
    }
    if (!host.landing && open && name === 'projects') {
      return {
        icon: 'computer',
        rgb: [143, 71, 174],
        ...box(open, [0.66, 0.52, 0.94, 0.84]),
      };
    }
    // Nothing to show: tuck back into the logo.
    return {
      icon: pop.icon ?? 'page',
      rgb: [pop.rgb[0] ?? 0, pop.rgb[1] ?? 0, pop.rgb[2] ?? 0],
      x: logoBlob.centre.x,
      y: logoBlob.centre.y,
      size: 0,
    };
  }

  const timers = new Set<number>();

  function drawFrame(t: number) {
    const k = Math.min(
      MAX_DT_FRAMES,
      Math.max(MIN_DT_FRAMES, (t - (lastT || t - FRAME_MS)) / FRAME_MS),
    );
    lastT = t;

    const lp = logoPlacement();
    if (!primed) {
      // Start below its resting place and rise, so the first paint settles in.
      logoBlob.place(lp.x, lp.y + 160, lp.size * 0.5);
      pop.place(lp.x, lp.y, 0);
      primed = true;
    }

    // Rotate the About caption every 9s while it is showing, unless a caption
    // is being held by /spell or a greeting.
    const openAbout = host.currentPanel === 'about';
    if (
      !host.landing &&
      openAbout &&
      t - state.lastInteract > CAPTION_CYCLE_MS &&
      t > state.holdUntil
    ) {
      state.lastInteract = t;
      rotateCaption();
    }

    const party = t < state.partyUntil;
    const falling = t < state.partyUntil - PARTY_FALL_MS;
    const pp = popPlacement();
    // A fresh pop starts from inside the logo.
    if (pop.centre.size < 3 && pp.size > 0) {
      pop.place(logoBlob.centre.x, logoBlob.centre.y, 0);
    }

    const env = {
      shapes,
      t,
      k,
      party,
      falling,
      viewportHeight: vh,
    };
    logoBlob.step({ ...env, placement: lp });
    pop.step({ ...env, placement: pp });

    ctx.clearRect(0, 0, vw, vh);

    droplets = droplets.filter((d) => {
      const q = (t - d.t0) / PARTICLE_FLIGHT_MS;
      if (q >= PARTICLE_LIFETIME) {
        return false;
      }
      const e = ease(Math.min(1, q));
      const x = d.x0 + (d.x1 - d.x0) * e;
      const y =
        d.y0 + (d.y1 - d.y0) * e - Math.sin(Math.PI * Math.min(1, q)) * 60;
      const r = 8 * (q < 1 ? 1 : 1 - (q - 1) / 0.25);
      ctx.fillStyle = rgbStr(d.rgb);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0, r), 0, TAU);
      ctx.fill();
      return true;
    });

    const drawEnv = {
      shapes,
      t,
      party,
      tail,
      logo,
      logoAspect: LOGO_ASPECT,
    };
    pop.draw(ctx, { ...drawEnv, shadow: 20 });
    logoBlob.draw(ctx, { ...drawEnv, shadow: host.landing ? 30 : 14 });

  }

  // Under reduced motion the shapes must not animate continuously, but they
  // still need to reposition when the visitor navigates. So the loop keeps
  // running while state changes and otherwise holds a still frame.
  let lastDrawnKey = '';

  function stateKey(): string {
    return [
      host.landing ? 'l' : 'e',
      host.currentPanel ?? '-',
      state.partyUntil > 0 ? 'p' : '-',
      Math.round(vw),
      Math.round(vh),
    ].join(':');
  }

  function loop(t: number) {
    if (disposed) {
      return;
    }
    frame = requestAnimationFrame(loop);
    if (reduced()) {
      const key = stateKey();
      if (key !== lastDrawnKey) {
        lastDrawnKey = key;
        drawFrame(t);
      }
      return;
    }
    lastDrawnKey = stateKey();
    drawFrame(t);
  }

  /** Force a redraw, e.g. when reduced motion is switched off. */
  function invalidate() {
    lastDrawnKey = '';
  }

  function holdCaption(html: string, holdMs: number) {
    if (holdMs) {
      state.holdUntil = performance.now() + holdMs;
      logoBlob.splash(5);
    }
    state.lastInteract = performance.now();
    const next = html;
    // The caption is mirrored by React into the About panel; the engine only
    // tracks when it may next rotate.
    captionSink(next);
  }

  function rotateCaption() {
    state.index = (state.index + 1) % 6;
    captionSink(captionFor(state.index));
  }

  function party(captionHtml: string) {
    state.partyUntil = performance.now() + PARTY_SPIN_MS;
    // The caption arrives only once the shapes have fallen and started
    // rebuilding, matching the prototype's delay.
    const id = window.setTimeout(
      () => holdCaption(captionHtml, PARTY_CAPTION_HOLD_MS),
      PARTY_CAPTION_DELAY,
    );
    timers.add(id);
  }

  /** `/spell WORD`: hold the word on the front page for everyone. */
  function setSpell(raw: string) {
    const cleaned = raw
      .toUpperCase()
      .replace(/[^A-Z0-9 !?:\-)(/.'&]/g, '')
      .trim()
      .slice(0, 12);
    if (!cleaned) {
      return;
    }
    const shown = cleaned.replace(/\n/g, ' ');
    holdCaption(`Someone in The Lobby says <b>${esc(shown)}</b>`, SPELL_HOLD);
  }

  function sendDropletToLatest() {
    if (host.landing) {
      return;
    }
    const open = panels.querySelector<HTMLElement>('.panel.open');
    const target = !open
      ? document.querySelector('#preview li:last-child')
      : open.dataset['panel'] === 'chat'
        ? document.querySelector('#log p:last-child')
        : null;
    if (!target) {
      return;
    }
    const r = target.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > vh) {
      return;
    }
    droplets.push({
      x0: logoBlob.centre.x,
      y0: logoBlob.centre.y,
      x1: r.left + 8,
      y1: r.top + r.height / 2,
      t0: performance.now(),
      rgb: [31, 111, 229],
    });
    logoBlob.splash(3);
  }

  // Fonts must be ready before the first draw, or the cloud's question text is
  // measured against a fallback face.
  void fontsReady().then(() => {
    shapes = buildShapes();
    tail = cloudTrail();
    invalidate();
  });

  frame = requestAnimationFrame(loop);
  const stopMotionWatch = onReducedMotionChange(() => invalidate());

  const effects: SwarmEffects = {
    splash: (force) => logoBlob.splash(force),
    sendDropletToLatest,
    holdCaption,
    party,
    setSpeaker: (name) => {
      state.speaker = name;
    },
    setOnline: (count) => {
      state.online = count;
    },
      setSpell,
    rotateCaption,
    setCaptionSink: (sink) => {
      captionSink = sink;
    },
  };

  return {
    effects,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', fit);
      stopMotionWatch();
      for (const id of timers) {
        window.clearTimeout(id);
      }
      timers.clear();
      droplets = [];
    },
  };
}

export type { Point, IconName };