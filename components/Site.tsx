'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ChatWindow } from './ChatWindow';
import {
  ChatDotsMount,
  Dotfield,
  PanelScenes,
  ScreensaverOverlay,
} from './CanvasEngines';
import { JellyLayer } from './JellyLayer';
import { HomeHit, Landing, Nav } from './Chrome';
import { AboutBody, BlogBody, ChatRestBody, ProjectsBody } from './Panels';
import { Bg, Panel, Tab } from './Panel';
import { useCarouselLayout } from '@/lib/useCarouselLayout';
import { useTactile } from '@/lib/useTactile';
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
/** Matches the `.panel` transform transition the carousel slides with. */
const SLIDE_MS = 620;

/**
 * The About caption.
 *
 * Rotation and the live chat values are owned by the jelly engine, which
 * publishes the caption into the store; React only renders it.
 */
function useAboutCaption(): string {
  const { captionHtml } = useSite();
  return captionHtml;
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
  const [chatCanvas, setChatCanvas] = useState<HTMLCanvasElement | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useTactile(layout, current, entered);

  /**
   * Mark the stage while the carousel is sliding.
   *
   * The stylesheet only applies the long `transform` transition to panels under
   * `#panels[data-moving]`. Without that scoping the same transition would also
   * apply to the tilt, which is written every frame while the pointer moves, and
   * the lean would arrive 600ms late and read as broken rather than soft.
   *
   * Written straight to the node rather than held in state: it is a CSS hook
   * with no bearing on what React renders, and putting it in state would cost a
   * render on every slide change for no benefit.
   */
  useEffect(() => {
    const stage = stageNode.current;
    if (!stage) {
      return;
    }
    if (!entered || current === null) {
      stage.removeAttribute('data-moving');
      return;
    }
    stage.setAttribute('data-moving', 'true');
    const timer = setTimeout(() => {
      stage.removeAttribute('data-moving');
    }, SLIDE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [current, entered]);

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
      {/* Grain and vignette. One element, no script, no request: the texture is
          an inline SVG turbulence filter and the vignette is a gradient. Opacity
          is kept low and the blend is overlay, where mid-grey is a no-op, so
          measured text contrast is left alone. */}
      <div className="film" aria-hidden="true" />
      <Landing entered={entered} onEnter={enterSite} />
      <HomeHit entered={entered} />
      <JellyLayer />
      <Dotfield />

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
          <canvas id="dots" aria-hidden="true" ref={setChatCanvas} />
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
      <ChatDotsMount canvas={chatCanvas} />
      <ScreensaverOverlay />
      <PanelScenes />
    </>
  );
}