'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  PARTY_MS,
  SPELL_MS,
  addLine,
  getState,
  readStoredScreenName,
  setState,
  subscribe,
  writeStoredScreenName,
  type ChatLine,
} from '@/lib/store';

export interface Person {
  sn: string;
  bot?: boolean;
  away?: boolean;
}

/** Seeded room from the prototype. Bots are placeholder personas (TASK-005). */
const INITIAL_PEOPLE: Person[] = [
  { sn: 'DialUpDan', bot: true },
  { sn: 'Y2Kpixie', bot: true },
  { sn: 'moonpie22' },
  { sn: 'sk8rgrrl_04', away: true },
  { sn: 'koreo_fan' },
];

const BANTER: ReadonlyArray<readonly [string, string]> = [
  ['DialUpDan', 'back in my day this page took 4 minutes to load. and we liked it.'],
  ['Y2Kpixie', 'dan it loads in like 0.2 seconds now!!! progress!!!'],
  ['DialUpDan', 'progress is just lag with better marketing.'],
  ['moonpie22', 'lol'],
  ['Y2Kpixie', 'brb changing my away message to a song lyric'],
  ['DialUpDan', 'if anyone needs me I will be defragmenting.'],
  ['Y2Kpixie', 'who wants to see my glitter gif collection'],
  ['DialUpDan', 'nobody. nobody wants that.'],
  ['koreo_fan', 'is there a new blog post yet'],
  ['Y2Kpixie', 'yes!! rebuilding koreokorp from scratch. go read it!!'],
  ['DialUpDan', 'someone typed in all caps earlier. I am still recovering.'],
  ['Y2Kpixie', 'ok but who is in everyone’s top 8 this week'],
];

const REPLIES: Record<string, readonly string[]> = {
  Y2Kpixie: ['omg {sn} same!!!', '{sn} that is SO real', 'hiii {sn} :-)', '{sn} you get it'],
  DialUpDan: [
    '{sn}. noted.',
    'bold of you to say that on a public channel, {sn}.',
    '{sn}, I have seen worse. not much worse.',
  ],
};

const QUESTION = 'good question, {sn}. have you tried turning it off and on again?';

/**
 * The screen name this browser asked to be remembered, or null.
 *
 * `localStorage` is a browser-only store, so it is read through
 * useSyncExternalStore with a null server snapshot. That lets React reconcile
 * the restored name after hydration instead of the cascading render that
 * setState-in-effect would cause, and it avoids a server/client markup mismatch
 * on the sign-on form.
 */
function subscribeToStoredName(): () => void {
  return () => {};
}

function readStoredName(): string | null {
  const value = readStoredScreenName();
  return value && SCREEN_NAME_PATTERN.test(value) ? value : null;
}

function noStoredName(): null {
  return null;
}
const SCREEN_NAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;
const MAX_MESSAGE = 300;
const BOT_REPLY_CHANCE = 0.5;
const IDLE_TYPING_MS = 1300;
const BANTER_MIN_MS = 6000;
const BANTER_JITTER_MS = 5000;

export const VALIDATION_MESSAGES = {
  format: 'Use 3 to 16 letters, numbers or underscores.',
  taken: 'That name is already in the room. Try another.',
} as const;

/**
 * The Lobby's behaviour, lifted out of the prototype's second IIFE.
 *
 * The original kept five independent uncancellable rAF loops, a recursive
 * `tick()` that stored no handle (so it was structurally impossible to cancel),
 * and roughly twenty listeners with no `removeEventListener`. Every timer here
 * is registered in `timers` and cleared on unmount.
 */
export function useChatRoom() {
  const [people, setPeople] = useState<Person[]>(INITIAL_PEOPLE);
  // `restored` is what this browser asked to remember; `signedOn` is this
  // visit's own choice. The session wins while it lasts.
  const restored = useSyncExternalStore(
    subscribeToStoredName,
    readStoredName,
    noStoredName,
  );
  const [signedOn, setSignedOn] = useState<string | null>(null);
  const me = signedOn ?? restored;
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [typed, setTyped] = useState('');
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const banterIndex = useRef(4);
  const seeded = useRef(false);

  /** Register a timer so unmount can cancel it. */
  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const id of pending) {
        clearTimeout(id);
      }
      pending.clear();
    };
  }, []);

  const isBot = useCallback(
    (sn: string) => people.some((p) => p.sn === sn && p.bot),
    [people],
  );

  /** Show a typing notice, then run the callback. */
  const typing = useCallback(
    (who: string, run: () => void, ms: number = IDLE_TYPING_MS) => {
      setStatus(`${who} is typing…`);
      later(() => {
        setStatus('');
        run();
      }, ms);
    },
    [later],
  );

  const say = useCallback(
    (bot: string, text: string, ms = 900) => {
      later(() => typing(bot, () => addLine({ who: bot, body: text, kind: 'bot' })), ms);
    },
    [later, typing],
  );

  // Seed the log once. The prototype seeded at script load; doing it in an
  // effect keeps it out of the server render and off the double-invoked path.
  useEffect(() => {
    if (seeded.current) {
      return;
    }
    seeded.current = true;
    addLine({ who: '', body: '*** You are viewing The Lobby.', kind: 'system' });
    for (const [who, text] of BANTER.slice(0, 4)) {
      addLine({ who, body: text, kind: 'chat' });
    }
  }, []);

  // Idle banter. The prototype recursed through `setTimeout(tick, ...)` without
  // ever keeping the handle; here every reschedule is registered, so leaving the
  // room actually stops the chatter.
  useEffect(() => {
    let alive = true;
    const schedule = () => {
      const id = setTimeout(
        () => {
          if (!alive) {
            return;
          }
          const entry = BANTER[banterIndex.current % BANTER.length];
          banterIndex.current += 1;
          if (entry) {
            const [who, text] = entry;
            typing(who, () => addLine({ who, body: text, kind: 'chat' }));
          }
          schedule();
        },
        BANTER_MIN_MS + Math.random() * BANTER_JITTER_MS,
      );
      timers.current.add(id);
    };
    schedule();
    return () => {
      alive = false;
    };
  }, [typing]);

  const signOn = useCallback(
    (raw: string): boolean => {
      const value = raw.trim();
      if (!SCREEN_NAME_PATTERN.test(value)) {
        setError(VALIDATION_MESSAGES.format);
        return false;
      }
      if (
        people.some((p) => p.sn.toLowerCase() === value.toLowerCase())
      ) {
        setError(VALIDATION_MESSAGES.taken);
        return false;
      }
      setError('');
      setSignedOn(value);
      writeStoredScreenName(value);
      setPeople((current) => [...current, { sn: value }]);
      addLine({
        who: '',
        body: `*** ${value} has entered the room.`,
        kind: 'system',
      });
      later(
        () =>
          typing(
            'Y2Kpixie',
            () =>
              addLine({
                who: 'Y2Kpixie',
                body: `hiii ${value}!!! welcome to the lobby!!!`,
                kind: 'bot',
              }),
          ),
        900,
      );
      later(
        () =>
          typing(
            'DialUpDan',
            () =>
              addLine({
                who: 'DialUpDan',
                body: `welcome, ${value}. please wipe your modem on the way in.`,
                kind: 'bot',
              }),
          ),
        4200,
      );
      return true;
    },
    [people, typing, later],
  );

  const runCommand = useCallback(
    (text: string) => {
      const [rawCmd = '', ...rest] = text.slice(1).split(' ');
      const arg = rest.join(' ').trim();
      const cmd = rawCmd.toLowerCase();
      const who = me ?? 'someone';
      switch (cmd) {
        case 'help':
          addLine({
            who: '',
            body: '*** Commands: /spell WORD · /party · /buzz · /away MESSAGE · /screensaver',
            kind: 'system',
          });
          break;
        case 'spell': {
          if (!arg) {
            addLine({
              who: '',
              body: '*** Usage: /spell WORD (up to 12 letters)',
              kind: 'system',
            });
            break;
          }
          const word = arg.slice(0, 12);
          setState({ spell: word });
          addLine({
            who: '',
            body: `*** ${who} put "${word.toUpperCase()}" on the front page.`,
            kind: 'system',
          });
          later(
            () => setState({ spell: null }),
            SPELL_MS,
          );
          say('Y2Kpixie', `omg ${who} it’s on the HOMEPAGE!!!`);
          break;
        }
        case 'party':
          setState({ partyUntil: Date.now() + PARTY_MS });
          later(() => setState({ partyUntil: 0 }), PARTY_MS);
          addLine({
            who: '',
            body: `*** ${who} started a party on the front page.`,
            kind: 'system',
          });
          say('DialUpDan', 'my eyes.', 1400);
          break;
        case 'buzz':
          setState({ buzzNonce: getState().buzzNonce + 1 });
          addLine({ who: '', body: `*** ${who} sent a buzz!`, kind: 'system' });
          say('DialUpDan', `do not buzz me, ${who}.`);
          break;
        case 'away':
          setPeople((current) =>
            current.map((p) => (p.sn === who ? { ...p, away: true } : p)),
          );
          addLine({
            who: '',
            body: `*** ${who} is away: ${arg || 'brb'}`,
            kind: 'system',
          });
          say('Y2Kpixie', 'love the away message!!!', 1200);
          break;
        case 'screensaver':
          addLine({
            who: '',
            body: '*** Starting the screensaver. Move the mouse to come back.',
            kind: 'system',
          });
          later(() => setState({ spell: null }), 500);
          break;
        default:
          addLine({
            who: '',
            body: `*** Unknown command /${cmd}. Type /help.`,
            kind: 'system',
          });
      }
    },
    [me, later, say],
  );

  const send = useCallback(() => {
    const text = typed.trim().slice(0, MAX_MESSAGE);
    if (!text || !me) {
      return;
    }
    setTyped('');
    if (text.startsWith('/')) {
      runCommand(text);
      return;
    }
    // Sending clears the sender's away flag, exactly as the prototype did.
    const wasAway = people.some((p) => p.sn === me && p.away);
    if (wasAway) {
      setPeople((current) =>
        current.map((p) => (p.sn === me ? { ...p, away: false } : p)),
      );
      addLine({ who: '', body: `*** ${me} is back.`, kind: 'system' });
    }
    addLine({ who: me, body: text, kind: 'self' });

    const bot = Math.random() < BOT_REPLY_CHANCE ? 'Y2Kpixie' : 'DialUpDan';
    const pool = REPLIES[bot] ?? [];
    const reply =
      text.includes('?') && bot === 'DialUpDan'
        ? QUESTION
        : (pool[Math.floor(Math.random() * pool.length)] ?? '');
    later(
      () => typing(bot, () => addLine({ who: bot, body: reply.replace('{sn}', me), kind: 'bot' })),
      700,
    );
  }, [typed, me, people, runCommand, later, typing]);

  const smile = useCallback(() => {
    setTyped((current) => `${current} :-) `);
  }, []);

  return {
    people,
    me,
    error,
    status,
    typed,
    setTyped,
    signOn,
    send,
    smile,
    runCommand,
    onlineCount: people.length,
  };
}

/** Subscribe to the shared chat log so the window re-renders as lines arrive. */
export function useChatLines(): ChatLine[] {
  return useSyncExternalStore(
    subscribe,
    () => getState().lines,
    () => getState().lines,
  );
}

/** The three most recent non-system lines, for the resting panel preview. */
export function useRecentChat(): ChatLine[] {
  const lines = useChatLines();
  return useMemo(
    () => lines.filter((line) => line.kind !== 'system').slice(-3),
    [lines],
  );
}