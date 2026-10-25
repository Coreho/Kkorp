'use client';

import { useEffect } from 'react';
import { Markdown } from './Markdown';
import { useContent } from '@/lib/useContent';

/** The Blog slide on the home page; a full load restores the carousel cleanly. */
const BLOG_HOME = '/#blog';

function postDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/**
 * One published entry at /blog/<slug>.
 *
 * Content arrives from the same public API as the carousel, which only ever
 * returns published entries, so drafts and unknown addresses both land on the
 * not-found state.
 */
export function PostPage({ slug }: { slug: string }) {
  const { content, error, ready } = useContent();
  const post = content.posts.find((entry) => entry.slug === slug && entry.status === 'published');
  const siteTitle = content.pages.pageTitle || 'KoreoKorp';

  useEffect(() => {
    if (!ready) return;
    document.title = post ? `${post.title} · ${siteTitle}` : `Entry not found · ${siteTitle}`;
  }, [post, ready, siteTitle]);

  let body;
  if (post) {
    body = (
      <article className="post-article" aria-labelledby="post-title">
        <header className="post-header">
          <p className="eyebrow">Journal</p>
          <h1 id="post-title">{post.title}</h1>
          <time dateTime={post.date}>{postDate(post.date)}</time>
        </header>
        {post.excerpt && <p className="post-standfirst">{post.excerpt}</p>}
        {post.image && <img className="post-cover" src={post.image} alt={post.imageAlt} />}
        <Markdown source={post.body} className="post-markdown" />
      </article>
    );
  } else if (!ready) {
    body = <p className="post-status" role="status">Loading entry…</p>;
  } else {
    body = (
      <div className="post-missing">
        <meta name="robots" content="noindex" />
        <h1>{error ? 'This entry could not be loaded' : 'Entry not found'}</h1>
        <p>{error ? 'The journal is unavailable right now. Refresh the page to try again.' : 'It may have been unpublished, or the address is mistyped.'}</p>
      </div>
    );
  }

  return (
    <div className="post-page">
      <div className="post-shell">
        <nav className="post-nav" aria-label="Journal">
          <a href={BLOG_HOME}>← All entries</a>
        </nav>
        <main>{body}</main>
        {post && (
          <footer className="post-footer">
            <a href={BLOG_HOME}>Back to the journal</a>
          </footer>
        )}
      </div>
    </div>
  );
}
