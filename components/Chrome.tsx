'use client';

const Arrow = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d={d} />
  </svg>
);

/**
 * `gone` and `hidden` are both driven by `entered`, matching the prototype's
 * enter()/backToStart() pair: entering adds `gone` to the landing and reveals
 * the docked header logo, and returning to the start reverses both.
 */
export function Landing({
  onEnter,
  entered,
}: {
  onEnter: () => void;
  entered: boolean;
}) {
  return (
    <section
      className={entered ? 'landing gone' : 'landing'}
      id="landing"
      aria-label="KoreoKorp"
    >
      <button
        className="landing-hit"
        id="enter"
        type="button"
        aria-label="Enter KoreoKorp"
        onClick={onEnter}
      />
      <div className="landing-meta" aria-hidden="true">
        <span>Independent web</span>
        <span>Est. 2026</span>
      </div>
      <div className="landing-copy">
        <p className="landing-kicker">Signal found</p>
        <p className="landing-tag">A small corner of the internet.</p>
        <p className="landing-hint">Click the logo to enter</p>
      </div>
    </section>
  );
}

export function HomeHit({ entered }: { entered: boolean }) {
  return (
    <button
      className="home-hit"
      id="homeHit"
      type="button"
      aria-label="Back to the start"
      hidden={!entered}
    />
  );
}

export function Nav({
  onGo,
  onStep,
  current,
  hidden,
}: {
  onGo: (index: number) => void;
  onStep: (delta: number) => void;
  current: number;
  hidden: boolean;
}) {
  const items = [
    { i: 0, no: '01', name: 'About' },
    { i: 1, no: '02', name: 'Blog' },
    { i: 2, no: '03', name: 'Projects' },
    { i: 3, no: '04', name: 'Lobby' },
  ];
  return (
    <nav className="cnav" id="cnav" aria-label="Sections" hidden={hidden}>
      {/* The travelling indicator behind the active section. Painted here
          rather than by `aria-current` so it can slide and squash; the
          attribute itself is untouched, because the repository check and the
          browser suite both pin it. */}
      <span className="cnav-pill" aria-hidden="true" />
      <button
        type="button"
        className="cnav-arrow"
        data-step="-1"
        aria-label="Previous section"
        onClick={() => onStep(-1)}
      >
        <Arrow d="M15 5l-7 7 7 7" />
      </button>
      {items.map((item) => (
        <button
          key={item.i}
          type="button"
          data-i={item.i}
          aria-current={item.i === current}
          onClick={() => onGo(item.i)}
        >
          <span>{item.no}</span>
          <b>{item.name}</b>
        </button>
      ))}
      <button
        type="button"
        className="cnav-arrow"
        data-step="1"
        aria-label="Next section"
        onClick={() => onStep(1)}
      >
        <Arrow d="M9 5l7 7-7 7" />
      </button>
    </nav>
  );
}