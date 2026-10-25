import { test, expect } from '@playwright/test';
import { initialContent } from '../../mockups/koreokorp-v2/content-model.js';

/**
 * Blog entry pages at /blog/<slug>. The public content API only returns
 * published entries; tests/admin.spec.js covers that side and the addresses
 * the editor assigns. Here the API is routed so each test controls the content.
 */

const markdownBody = [
  'An opening paragraph with **bold words**, *a slanted aside*, `inline code`, and [a link](https://example.com/notes).',
  'A second line in the same paragraph.',
  '',
  '## What changed',
  '',
  '- The blog has pages',
  '- Each entry has an address',
  '',
  '1. Write',
  '2. Publish',
  '',
  '> A quoted thought.',
  '',
  '```',
  'const answer = 42;',
  '```',
  '',
  '---',
  '',
  'See https://example.com/more for more.',
].join('\n');

function contentWith(posts) {
  const content = initialContent();
  content.posts = posts.map((post) => ({ excerpt: '', image: '', imageAlt: '', status: 'published', ...post }));
  return content;
}

async function serve(page, content) {
  await page.route('**/api/content', (route) => route.fulfill({ json: content }));
}

test('the Blog list opens each published entry on its own page, newest first', async ({ page }) => {
  await serve(page, contentWith([
    { id: 'older', slug: 'first-light', title: 'First light', date: '2026-09-01', body: 'The first entry.' },
    { id: 'newer', slug: 'the-blog-has-pages', title: 'The blog has pages', date: '2026-10-20', excerpt: 'Entries now open on their own pages.', body: markdownBody },
    // Entries from a content service that predates addresses get one from their title.
    { id: 'legacy', title: 'An older note', date: '2026-08-15', body: 'Written before addresses.' },
  ]));
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await page.locator('[data-i="1"]').click();
  const entries = page.locator('[data-panel="blog"] .post-list a');
  await expect(entries).toHaveCount(3);
  expect(await entries.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual([
    '/blog/the-blog-has-pages',
    '/blog/first-light',
    '/blog/an-older-note',
  ]);

  await entries.first().click();
  await expect(page).toHaveURL(/\/blog\/the-blog-has-pages$/);
  const article = page.getByRole('article');
  await expect(article.getByRole('heading', { level: 1 })).toHaveText('The blog has pages');
  await expect(article.locator('time')).toHaveText('Oct 20, 2026');
  await expect(article.locator('.post-standfirst')).toHaveText('Entries now open on their own pages.');
  await expect(page).toHaveTitle('The blog has pages · KoreoKorp V2 Mockup');

  const body = article.locator('.post-markdown');
  await expect(body.locator('strong')).toHaveText('bold words');
  await expect(body.locator('em')).toHaveText('a slanted aside');
  await expect(body.locator('p').first().locator('br')).toHaveCount(1);
  await expect(body.getByRole('link', { name: 'a link' })).toHaveAttribute('href', 'https://example.com/notes');
  await expect(body.getByRole('heading', { level: 2 })).toHaveText('What changed');
  await expect(body.locator('ul > li')).toHaveText(['The blog has pages', 'Each entry has an address']);
  await expect(body.locator('ol > li')).toHaveText(['Write', 'Publish']);
  await expect(body.locator('blockquote')).toHaveText('A quoted thought.');
  await expect(body.locator('pre code')).toHaveText('const answer = 42;');
  await expect(body.locator('hr')).toHaveCount(1);
  await expect(body.getByRole('link', { name: 'https://example.com/more' })).toHaveAttribute('href', 'https://example.com/more');
  // Desktop: a centred reading column, no sideways scrolling.
  const desktop = await page.locator('.post-page').evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth }));
  expect(desktop.scroll).toBeLessThanOrEqual(desktop.client);
  expect((await page.locator('.post-shell').boundingBox()).width).toBeLessThanOrEqual(720);
  await page.screenshot({ path: 'test-results/blog-entry-desktop.png' });

  await page.getByRole('link', { name: '← All entries' }).click();
  await expect(page).toHaveURL(/\/#blog$/);
  await expect(page.locator('[data-panel="blog"]')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('[data-panel="blog"] .post-list a').first()).toBeVisible();
});

test('markup in an entry shows as text and unsafe links are dropped', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await serve(page, contentWith([{
    id: 'unsafe',
    slug: 'unsafe',
    title: 'Unsafe <b>title</b>',
    date: '2026-10-21',
    body: [
      '<script>window.__ran = 1</script>',
      '',
      '<img src="x" onerror="window.__ran = 2">',
      '',
      '[run it](javascript:window.__ran=3) [data](data:text/html,hi) [other host](//example.org) [ok](https://example.com/ok)',
    ].join('\n'),
  }]));
  await page.goto('/blog/unsafe');
  const body = page.locator('.post-markdown');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Unsafe <b>title</b>');
  await expect(body).toContainText('<script>window.__ran = 1</script>');
  await expect(body).toContainText('<img src="x" onerror="window.__ran = 2">');
  await expect(page.locator('article script, article img, h1 b')).toHaveCount(0);
  for (const name of ['run it', 'data', 'other host']) {
    await expect(body.getByText(name)).toBeVisible();
    await expect(body.getByRole('link', { name })).toHaveCount(0);
  }
  await expect(body.getByRole('link', { name: 'ok' })).toHaveAttribute('href', 'https://example.com/ok');
  expect(await page.evaluate(() => window.__ran)).toBeUndefined();
  expect(errors).toEqual([]);
});

test('unknown, unpublished and malformed addresses are not readable', async ({ page }) => {
  await serve(page, contentWith([
    { id: 'live', slug: 'live', title: 'Live entry', date: '2026-10-01', body: 'Public.' },
    // The API never sends drafts; the page refuses one anyway.
    { id: 'draft', slug: 'secret-draft', title: 'Secret draft', date: '2026-10-02', body: 'Private.', status: 'draft' },
  ]));
  for (const slug of ['secret-draft', 'no-such-entry']) {
    await page.goto(`/blog/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entry not found');
    await expect(page.getByText('Private.')).toHaveCount(0);
    await expect(page).toHaveTitle('Entry not found · KoreoKorp V2 Mockup');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  }
  const malformed = await page.goto('/blog/Not_An%20Address');
  expect(malformed.status()).toBe(404);
});

test('an entry page explains when the journal cannot be loaded', async ({ page }) => {
  await page.route('**/api/content', (route) => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await page.goto('/blog/anything');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This entry could not be loaded');
  await expect(page.getByRole('link', { name: '← All entries' })).toHaveAttribute('href', '/#blog');
});

test('entry pages fit a 390px phone without sideways scrolling', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await serve(page, contentWith([{
    id: 'long',
    slug: 'long',
    title: 'A deliberately long entry title that has to wrap across several lines on a phone',
    date: '2026-10-22',
    excerpt: 'A standfirst that also wraps.',
    body: `${markdownBody}\n\nA very long unbroken address: https://example.com/${'segment/'.repeat(20)}end\n\n\`\`\`\n${'x'.repeat(200)}\n\`\`\``,
  }]));
  await page.goto('/blog/long');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const scroller = page.locator('.post-page');
  const sizes = await scroller.evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
  // The page itself scrolls vertically to reach the end of the entry.
  await page.getByRole('link', { name: 'Back to the journal' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('link', { name: 'Back to the journal' })).toBeInViewport();
  expect((await page.getByRole('link', { name: '← All entries' }).boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: 'test-results/blog-entry-390.png', fullPage: false });
  await context.close();
});
