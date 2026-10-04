'use client';

import { Action, Bg, SectionNo, Tab } from './Panel';
import type { PanelId } from '@/lib/store';

const POSTS = [
  {
    date: '2026-09-29',
    label: 'Sep 29, 2026',
    title: 'Rebuilding KoreoKorp from scratch',
    excerpt: 'Why V2 is Next.js, Supabase and Vercel, and why it still has a chat room.',
  },
  {
    date: '2026-09-12',
    label: 'Sep 12, 2026',
    title: 'Meet the bots',
    excerpt: "Two AI regulars live in the lobby. They argue so you don't have to.",
  },
  {
    date: '2026-08-30',
    label: 'Aug 30, 2026',
    title: 'Screen names are back',
    excerpt: "No login, no email. Pick a name and you're in.",
  },
];

export function AboutBody({
  caption,
  onGotoChat,
  onCopy,
  copied,
}: {
  caption: string;
  onGotoChat: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <>
      <Bg />
      <Tab label="About" />
      <div className="inner">
        <div className="eyebrow">KoreoKorp · V2</div>
        <h2>
          About <SectionNo>01</SectionNo>
        </h2>
        <div className="rest stack">
          <p className="blurb">
            A small corner of the internet. Posts, projects, and a chat room you
            can walk into with nothing but a screen name.
          </p>
          <p className="now" data-now aria-live="polite">
            {caption}
          </p>
        </div>
        <div className="detail about">
          <p className="long">
            KoreoKorp is a small corner of the internet: posts, projects, and a
            chat room from 2003 living inside a modern website. No accounts, no
            feed. Pick a name and say hi.
          </p>
          <div className="about-grid">
            <section>
              <h3>
                Timeline <span className="ph">placeholder</span>
              </h3>
              <ol className="tl">
                <li>
                  <b>2003</b>
                  <span>Away messages, buddy lists, 56k.</span>
                </li>
                <li>
                  <b>20XX</b>
                  <span>KoreoKorp V1 goes up.</span>
                </li>
                <li>
                  <b>2026</b>
                  <span>V2: four panels, a blog, and The Lobby.</span>
                </li>
              </ol>
            </section>
            <section>
              <h3>
                Find KoreoKorp <span className="ph">placeholder</span>
              </h3>
              <ul className="links">
                <li>
                  <span>Email</span>
                  <code id="mail">you@koreokorp.com</code>
                  <button
                    type="button"
                    className="copy"
                    data-copy="mail"
                    onClick={onCopy}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </li>
                <li>
                  <span>GitHub</span>
                  <code>github.com/your-handle</code>
                </li>
                <li>
                  <span>Chat</span>
                  <button
                    type="button"
                    className="jump"
                    data-goto="chat"
                    onClick={onGotoChat}
                  >
                    Enter The Lobby →
                  </button>
                </li>
              </ul>
            </section>
          </div>
          <p className="now" data-now aria-live="polite">
            {caption}
          </p>
        </div>
        <Action label="About" />
      </div>
    </>
  );
}

export function BlogBody() {
  return (
    <>
      <Bg />
      <Tab label="Blog" />
      <div className="inner">
        <div className="eyebrow">Journal</div>
        <h2>
          Blog <SectionNo>02</SectionNo>
        </h2>
        <div className="rest stack">
          <p className="blurb">
            Notes and updates, written from the admin page and published here.
          </p>
          <div className="latest">
            <small>Latest post</small>
            <strong>{POSTS[0]?.title}</strong>
            <span>Sep 29, 2026 · 4 min read</span>
          </div>
        </div>
        <div className="detail">
          <ul className="post-list">
            {POSTS.map((post) => (
              <li key={post.date}>
                <time dateTime={post.date}>{post.label}</time>
                <div>
                  <strong>{post.title}</strong>
                  <p>{post.excerpt}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="admin-note">
            Sample posts. Real ones come from the <code>posts</code> table,
            written at <code>/admin</code>.
          </p>
        </div>
        <Action label="Read the blog" />
      </div>
    </>
  );
}

export function ProjectsBody() {
  return (
    <>
      <Bg />
      <Tab label="Projects" />
      <div className="inner">
        <div className="eyebrow">Work</div>
        <h2>
          Projects <SectionNo>03</SectionNo>
        </h2>
        <div className="rest stack">
          <p className="blurb">Things being built, tried, and occasionally finished.</p>
          <div className="tags">
            <span>Next.js</span>
            <span>Supabase</span>
            <span>Realtime chat</span>
            <span>AI bots</span>
          </div>
        </div>
        <div className="detail">
          <div className="proj">
            <div>
              <strong>KoreoKorp V2</strong>
              <span>This site. Four panels, one blog, one chat room.</span>
            </div>
            <div>
              <strong>The Lobby</strong>
              <span>A shared chat room with screen names and two resident bots.</span>
            </div>
            <div>
              <strong>Placeholder project</strong>
              <span>Swap in a real project, link, or screenshot.</span>
            </div>
          </div>
        </div>
        <Action label="See projects" />
      </div>
    </>
  );
}

export function ChatRestBody({
  onlineCount,
  preview,
}: {
  onlineCount: number;
  preview: string[];
}) {
  return (
    <div className="rest col">
      <div className="eyebrow">The Lobby</div>
      <h2>
        Chat room <SectionNo>04</SectionNo>
      </h2>
      <p className="blurb">
        One shared room. Pick a screen name and jump in. Two bots are always
        here, and they never stop talking.
      </p>
      <div className="online">
        <i />
        <span id="onlineCount">{onlineCount} in the room now</span>
      </div>
      <ul className="preview" id="preview" aria-live="off">
        {preview.map((text, index) => (
          <li key={`${text}-${String(index)}`}>{text}</li>
        ))}
      </ul>
      {/* The prototype's chat action button is hidden by `.panel .action`, so it
          is reproduced inert; signing on happens in the window itself. */}
      <button className="action" type="button" data-open>
        <span>Enter the room</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 12h15m-6-6 6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}

export type { PanelId };