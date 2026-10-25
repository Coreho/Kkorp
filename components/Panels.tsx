'use client';

import { Action, Bg, SectionNo, Tab } from './Panel';
import type { PanelId } from '@/lib/store';
import { useContent } from '@/lib/useContent';
import type { Project } from '../mockups/koreokorp-v2/content-model.js';
import fallbackLogo from '@/assets/koreokorp-logo-cutout.webp';

/**
 * The rotating About caption.
 *
 * The jelly engine owns the caption text and emits it as HTML, because entries
 * highlight a name or a count in bold. It escapes every interpolated value
 * before wrapping it, so the only markup here is the engine's own `<b>`. The
 * prototype set `innerHTML` on this node directly; in React the equivalent is an
 * explicit HTML sink.
 */
function NowCaption({ html }: { html: string }) {
  return (
    <p
      className="now"
      data-now
      aria-live="polite"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

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
  const { content: { pages } } = useContent();
  return (
    <>
      <Bg />
      <Tab label="About" />
      <div className="inner">
        <div className="eyebrow">KoreoKorp · V2</div>
        <h2>
          {pages.aboutHeading} <SectionNo>01</SectionNo>
        </h2>
        <div className="rest stack">
          <p className="blurb">
            {pages.aboutIntro}
          </p>
          <NowCaption html={caption} />
        </div>
        <div className="detail about">
          <p className="long">
            {pages.aboutBody}
          </p>
          <div className="about-grid">
            <section>
              <h3>
                Timeline <span className="ph">placeholder</span>
              </h3>
              <ol className="tl">
                <li>
                  <b>{pages.timelineYear1}</b>
                  <span>{pages.timeline1}</span>
                </li>
                <li>
                  <b>{pages.timelineYear2}</b>
                  <span>{pages.timeline2}</span>
                </li>
                <li>
                  <b>{pages.timelineYear3}</b>
                  <span>{pages.timeline3}</span>
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
                  <code id="mail">{pages.email}</code>
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
                  <code>{pages.github}</code>
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
          <NowCaption html={caption} />
        </div>
        <Action label={pages.aboutAction ?? 'About'} />
      </div>
    </>
  );
}

export function BlogBody() {
  const { content: { pages, posts }, error } = useContent();
  const published = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return (
    <>
      <Bg />
      <Tab label="Blog" />
      <div className="inner">
        <div className="eyebrow">Journal</div>
        <h2>
          {pages.blogHeading} <SectionNo>02</SectionNo>
        </h2>
        <div className="rest stack">
          <p className="blurb">
            {pages.blogIntro}
          </p>
          <div className="latest">
            <small>{published.length ? 'Latest post' : 'The journal'}</small>
            <strong>{published[0]?.title ?? 'No entries yet. Check back soon.'}</strong>
            {published[0] && <span>{dateLabel(published[0].date)}</span>}
          </div>
        </div>
        <div className="detail">
          <ul className="post-list">
            {published.map((post) => (
              <li key={post.id}>
                <time dateTime={post.date}>{dateLabel(post.date)}</time>
                <details className="published-post">
                  <summary><strong>{post.title}</strong><p>{post.excerpt || 'Read entry'}</p></summary>
                  {post.image && <img className="content-image" src={post.image} alt={post.imageAlt} loading="lazy" />}
                  <div className="post-body">{post.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
                </details>
              </li>
            ))}
          </ul>
          <p className="admin-note">
            {error ? 'Entries could not be loaded. Refresh the page to try again.' : published.length ? 'Select an entry to read it.' : 'The journal is waiting for its first entry.'}
          </p>
        </div>
        <Action label={pages.blogAction ?? 'Read the blog'} />
      </div>
    </>
  );
}

function ProjectCard({
  title,
  description,
  url,
  image,
  imageAlt,
}: Project) {
  const faces = (
    <span className="project-flip-inner">
      <span className="project-face project-front">
        <img className="project-logo" src={image || fallbackLogo.src} alt={imageAlt || `${title} logo`} loading="lazy" />
      </span>
      <span className="project-face project-back" aria-hidden="true">
        <span>{description}</span>
      </span>
    </span>
  );
  return (
    <article className="project-record">
      {url ? (
        <a className="project-flip" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${title}: ${description} (opens in a new tab)`}>
          {faces}
        </a>
      ) : (
        <button className="project-flip" type="button" aria-label={`${title}: ${description}`}>
          {faces}
        </button>
      )}
    </article>
  );
}

export function ProjectsBody() {
  const { content: { pages, projects } } = useContent();
  return (
    <>
      <Bg />
      <Tab label="Projects" />
      <div className="inner">
        <div className="eyebrow">Work</div>
        <h2>
          {pages.projectsHeading} <SectionNo>03</SectionNo>
        </h2>
        <div className="rest stack">
          <p className="blurb">{pages.projectsIntro}</p>
          <div className="tags">
            <span>Next.js</span>
            <span>Supabase</span>
            <span>Realtime chat</span>
            <span>AI bots</span>
          </div>
        </div>
        <div className="detail">
          <div className="proj">
            {projects.map((project) => (
              <ProjectCard key={project.id} {...project} />
            ))}
            {!projects.length && <p>New projects are on the way.</p>}
          </div>
        </div>
        <Action label={pages.projectsAction ?? 'See projects'} />
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
  const { content: { pages } } = useContent();
  return (
    <div className="rest col">
      <div className="eyebrow">The Lobby</div>
      <h2>
        {pages.chatHeading} <SectionNo>04</SectionNo>
      </h2>
      <p className="blurb">
        {pages.chatIntro}
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
        <span>{pages.chatAction}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 12h15m-6-6 6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}

export type { PanelId };
