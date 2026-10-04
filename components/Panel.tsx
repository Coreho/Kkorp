'use client';

import type { ReactNode } from 'react';
import type { PanelId } from '@/lib/store';
import type { PanelLayout } from '@/lib/useCarouselLayout';

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 12h15m-6-6 6 6-6 6" />
  </svg>
);

const Close = ({ label, onClose }: { label: string; onClose: () => void }) => (
  <button
    className="close"
    type="button"
    aria-label={label}
    onClick={(event) => {
      // The prototype stops propagation here so the panel's own click handler
      // does not immediately reopen what this button just closed.
      event.stopPropagation();
      onClose();
    }}
  >
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  </button>
);

/**
 * One carousel slide.
 *
 * The prototype applied width/transform/opacity imperatively inside `layout()`
 * and toggled `open`, `peek`, `peek-l` and `peek-r` alongside `aria-hidden`.
 * Those writes are props now, and `aria-hidden` is derived from the same
 * distance value that produces the transform, so the two cannot disagree.
 */
export function Panel({
  id,
  index,
  title,
  layout,
  isOpen,
  onOpen,
  onClose,
  closeLabel,
  children,
}: {
  id: PanelId;
  index: number;
  title: string;
  layout: PanelLayout;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
}) {
  const className = [
    'panel',
    `p${index + 1}`,
    isOpen ? 'open' : '',
    layout.peek ? 'peek' : '',
    layout.peekL ? 'peek-l' : '',
    layout.peekR ? 'peek-r' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={className}
      data-panel={id}
      aria-label={title}
      aria-hidden={!isOpen}
      style={{
        width: layout.width,
        transformOrigin: layout.transformOrigin,
        transform: layout.transform,
        opacity: layout.opacity,
      }}
      onClick={(event) => {
        // The prototype ignored clicks that landed on a close control or on a
        // node a scene had marked as dragged.
        const target = event.target as HTMLElement;
        if (target.closest('.close, [data-close]')) {
          return;
        }
        if (target.closest('[data-drag]')) {
          return;
        }
        if (!isOpen) {
          onOpen();
        }
      }}
    >
      {children}
      <Close label={closeLabel} onClose={onClose} />
    </section>
  );
}

export function Tab({ label }: { label: string }) {
  return <div className="tab">{label}</div>;
}

export function Bg() {
  return <div className="bg" />;
}

/**
 * The prototype keeps these buttons in the markup but CSS hides them
 * (`.panel .action { display: none }` — "the old panel 'open' buttons do
 * nothing in the carousel"). They are reproduced unhidden-pending so the port
 * stays faithful and they become live only if the design review asks for them.
 */
export function Action({ label }: { label: string }) {
  return (
    <button className="action" type="button" data-open>
      <span>{label}</span>
      <Arrow />
    </button>
  );
}

export function SectionNo({ children }: { children: ReactNode }) {
  return (
    <span className="section-no" aria-hidden="true">
      {children}
    </span>
  );
}