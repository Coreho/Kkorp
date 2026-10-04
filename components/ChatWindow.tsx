'use client';

import { useEffect, useRef } from 'react';
import { useChatLines, useChatRoom } from '@/lib/useChatRoom';
import { useSite } from '@/lib/useSite';

function SmileIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#f6c800" stroke="#000" strokeWidth="1" />
      <path
        d="M5 10.5c1.6 1.4 4.4 1.4 6 0"
        stroke="#000"
        strokeWidth="1.2"
        fill="none"
      />
      <circle cx="6" cy="6.5" r="1" fill="#000" />
      <circle cx="10" cy="6.5" r="1" fill="#000" />
    </svg>
  );
}

/**
 * The AIM-style chat window.
 *
 * Every id here is pinned by tests/smoke.spec.js (`log`, `whoami`, `buddies`,
 * `sn`, `snErr`, `signon`, `msg`, `composer`, `buddyCount`, `roomCount`) and by
 * scripts/check.mjs. The bot personas are placeholders until TASK-005.
 */
export function ChatWindow({ onClose }: { onClose: () => void }) {
  const chat = useChatRoom();
  const lines = useChatLines();
  const { buzzNonce } = useSite();
  const windowRef = useRef<HTMLDivElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const msgRef = useRef<HTMLTextAreaElement | null>(null);
  const snRef = useRef<HTMLInputElement | null>(null);

  // Follow the tail only when the reader was already near the bottom, matching
  // the prototype's 40px threshold, and always for your own message.
  useEffect(() => {
    const log = logRef.current;
    if (!log) {
      return;
    }
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
    const last = lines[lines.length - 1];
    if (nearBottom || last?.kind === 'self') {
      log.scrollTop = log.scrollHeight;
    }
  }, [lines]);

  // Replaying the buzz animation needs the class removed and reapplied around a
  // forced reflow. Doing that from a render is not possible, so the nonce drives
  // it from an effect.
  useEffect(() => {
    const node = windowRef.current;
    if (!node || buzzNonce === 0) {
      return;
    }
    node.classList.remove('buzz');
    void node.offsetWidth;
    node.classList.add('buzz');
  }, [buzzNonce]);

  return (
    <div className="aim" role="region" aria-label="The Lobby chat window" ref={windowRef}>
      <div className="aim-title">
        <SmileIcon />
        <span className="t">The Lobby · KoreoKorp Chat</span>
        <button className="wbtn bevel" data-close type="button" aria-label="Minimize chat">
          _
        </button>
        <button className="wbtn bevel" data-close type="button" aria-label="Leave chat room" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="aim-menu" aria-hidden="true">
        <span>File</span>
        <span>Edit</span>
        <span>People</span>
        <span>Help</span>
      </div>
      <div className="aim-info">
        <span id="whoami">{chat.me ? `Signed on as ${chat.me}` : 'Not signed on'}</span>
        <span id="roomCount">{chat.onlineCount} people in room</span>
      </div>
      <div className="aim-body">
        <div className="aim-log sunk" id="log" aria-live="polite" ref={logRef}>
          {lines.map((line) =>
            line.kind === 'system' ? (
              <p className="sys" key={line.id}>
                {line.body}
              </p>
            ) : (
              <p key={line.id}>
                <span
                  className={[
                    'sn',
                    line.kind === 'self' ? 'self' : '',
                    chat.people.some((p) => p.sn === line.who && p.bot) ? 'bot' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {line.who}
                </span>
                {chat.people.some((p) => p.sn === line.who && p.bot) ? (
                  <span className="chip">BOT</span>
                ) : null}
                {`: ${line.body}`}
              </p>
            ),
          )}
        </div>
        <aside className="aim-buddies sunk" aria-label="People in room">
          <h3>
            In this room (<span id="buddyCount">{chat.onlineCount}</span>)
          </h3>
          <ul id="buddies">
            {chat.people.map((person) => (
              <li
                key={person.sn}
                className={[person.bot ? 'bot' : '', person.away ? 'away' : '', person.sn === chat.me ? 'me' : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                <i />
                {person.sn}
                {person.away ? ' (away)' : ''}
                {person.bot ? <span className="chip">BOT</span> : null}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <form
        className="aim-compose"
        id="composer"
        onSubmit={(event) => {
          event.preventDefault();
          chat.send();
        }}
      >
        <div className="aim-tools">
          <button type="button" className="bevel" id="smile" aria-label="Insert smiley" onClick={chat.smile}>
            :-)
          </button>
          <span className="hint">Enter sends · try /help</span>
        </div>
        <div className="aim-row">
          <textarea
            id="msg"
            ref={msgRef}
            className="sunk"
            maxLength={300}
            placeholder="Type a message…"
            aria-label="Message"
            value={chat.typed}
            onChange={(event) => chat.setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button className="aim-send bevel" type="submit">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M3 12 21 4l-5 16-4-6-9-2z"
                fill="#f6c800"
                stroke="#000"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            Send
          </button>
        </div>
      </form>
      <div className="aim-status sunk" id="status">
        {chat.status || '\u00a0'}
      </div>

      <form
        className="signon"
        id="signon"
        hidden={chat.me !== null}
        onSubmit={(event) => {
          event.preventDefault();
          if (chat.signOn(snRef.current?.value ?? '')) {
            msgRef.current?.focus();
          }
        }}
      >
        <div className="signon-box bevel">
          <div className="aim-title">
            <span className="t">Sign On</span>
          </div>
          <div className="signon-body">
            <h3>Pick a screen name</h3>
            <p>No account needed. This browser remembers it for next time.</p>
            <label htmlFor="sn">Screen name</label>
            <input
              id="sn"
              ref={snRef}
              className="sunk"
              maxLength={16}
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. koreo_kid"
            />
            <div className="err" id="snErr">
              {chat.error}
            </div>
            <button className="bevel" type="submit">
              Sign On
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}