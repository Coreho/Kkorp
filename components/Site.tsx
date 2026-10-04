'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ChatWindow } from './ChatWindow';
import { HomeHit, Landing, Nav } from './Chrome';
import { AboutBody, BlogBody, ChatRestBody, ProjectsBody } from './Panels';
import { Bg, Panel, Tab } from './Panel';
import { useCarouselLayout } from '@/lib/useCarouselLayout';
import { useRecentChat } from '@/lib/useChatRoom';
import { useSite } from '@/lib/useSite';
import {
  PANEL_ORDER,
  enter as enterSite,
  exit as exitSite,
  goTo,
  isTypingTarget,
  step,
  type PanelId,
} from '@/lib/store';

const SWIPE_THRESHOLD = 60;
const SWIPE_DOMINANCE = 1.5;
const COPY_FEEDBACK_MS = 1600;

/** The About caption: who spoke last and how many are in the room. */
function useAboutCaption(): string {
  const { people, screenName, lines } = useSite();
  const lastSpeaker = [...lines].reverse().find((line) => line.kind !== 'system');
  return `${lastSpeaker ? `${lastSpeaker.who} spoke last` : 'The room is quiet'} · ${people.length} online${screenName ? ' · you are here' : ''}`;
}

export function Site() {
  const site = useSite();
  const { entered, current } = site;
  const { ref: measureStage, layout } = useCarouselLayout(current);
  const stageNode = useRef<HTMLElement | null>(null);
  const setStage = useCallback(
    (node: HTMLElement | null) => {
      stageNode.current = node;
      measureStage(node);
    },
    [measureStage],
  );
  const stageRef = setStage;
  const caption = useAboutCaption();
  const recent = useRecentChat();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) {
        clearTimeout(copyTimer.current);
      }
    };
  }, []);

  const currentIndex = current ? PANEL_ORDER.indexOf(current) : 0;

  const openByIndex = useCallback((index: number) => {
    const id = PANEL_ORDER[((index % PANEL_ORDER.length) + PANEL_ORDER.length) % PANEL_ORDER.length];
    if (id) {
      goTo(id);
    }
  }, []);

  const goBackOne = useCallback(() => {
    openByIndex(currentIndex - 1);
  }, [currentIndex, openByIndex]);

  const copyEmail = useCallback(() => {
    const mail = document.getElementById('mail');
    if (!mail) {
      return;
    }
    const done = () => {
      setCopied(true);
      if (copyTimer.current) {
        clearTimeout(copyTimer.current);
      }
      copyTimer.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    };
    navigator.clipboard
      ?.writeText(mail.textContent ?? '')
      .then(done)
      .catch(() => {
        // Clipboard permission denied: select the address so it can be copied
        // by hand rather than failing silently.
        const range = document.createRange();
        range.selectNodeContents(mail);
        const selection = getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      });
  }, []);

  // Arrow keys move the carousel, but never while the visitor is typing. Escape
  // returns to the landing page.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!entered) {
        return;
      }
      if (event.key === 'Escape') {
        exitSite();
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      if (event.key === 'ArrowRight') {
        step(1);
      } else if (event.key === 'ArrowLeft') {
        step(-1);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [entered]);

  // Horizontal swipe between slides, ignored inside the chat window so that
  // dragging across a message does not flip the carousel.
  useEffect(() => {
    const stage = stageNode.current;
    if (!stage) {
      return;
    }
    let startX: number | null = null;
    let startY = 0;
    const onDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (event.pointerType !== 'touch' || target.closest('.aim')) {
        return;
      }
      startX = event.clientX;
      startY = event.clientY;
    };
    const onUp = (event: PointerEvent) => {
      if (startX === null) {
        return;
      }
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      startX = null;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * SWIPE_DOMINANCE) {
        step(dx < 0 ? 1 : -1);
      }
    };
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointerup', onUp);
    return () => {
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointerup', onUp);
    };
  }, [entered]);

  const panelProps = (id: PanelId, index: number, title: string, closeLabel: string) => ({
    id,
    index,
    title,
    layout: layout.panels[id],
    isOpen: current === id,
    onOpen: () => openByIndex(index),
    onClose: goBackOne,
    closeLabel,
  });

  return (
    <>
      <Landing entered={entered} onEnter={enterSite} />
      <HomeHit entered={entered} />
      <canvas className="dotfield" id="dotfield" aria-hidden="true" />

      <Nav onGo={openByIndex} onStep={step} current={currentIndex} hidden={!entered} />

      <main
        id="panels"
        ref={stageRef}
        className={entered ? 'has-open' : 'stage-off'}
        style={{ '--peek': layout.peekPx } as CSSProperties}
      >
        <Panel {...panelProps('about', 0, 'About KoreoKorp', 'Close panel')}>
          <AboutBody
            caption={caption}
            onGotoChat={() => goTo('chat')}
            onCopy={copyEmail}
            copied={copied}
          />
        </Panel>

        <Panel {...panelProps('blog', 1, 'Blog', 'Close panel')}>
          <BlogBody />
        </Panel>

        <Panel {...panelProps('projects', 2, 'Projects', 'Close panel')}>
          <ProjectsBody />
        </Panel>

        <Panel {...panelProps('chat', 3, 'Chat room', 'Close chat room')}>
          <canvas id="dots" aria-hidden="true" />
          <Bg />
          <Tab label="The Lobby" />
          <div className="inner">
            <ChatRestBody
              onlineCount={site.people.length}
              preview={recent.map((line) => `${line.who} ${line.body}`)}
            />
            <div className="detail center">
              <ChatWindow onClose={goBackOne} />
            </div>
          </div>
        </Panel>
      </main>

      <div className="sample-tag">Mockup · sample content</div>
    </>
  );
}