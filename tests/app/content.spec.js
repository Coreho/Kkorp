import { test, expect } from '@playwright/test';
import { emptyProject, initialContent } from '../../mockups/koreokorp-v2/content-model.js';

test('published content updates the React panels and safely renders complete entries', async ({ page }) => {
  const content = initialContent();
  content.pages.landingTag = 'A new signal.';
  content.pages.aboutHeading = 'Behind the scenes';
  content.projects.push({ id: 'radio', title: 'Pocket radio', description: 'A project from the workshop.', status: 'published', image: '', imageAlt: '', url: 'https://example.com/radio' });
  content.posts.push({ id: 'workshop', title: 'From the workshop', date: '2026-10-23', excerpt: 'Some recent notes.', body: 'An entry with <script>literal text</script>.', status: 'published', image: '', imageAlt: '' });
  await page.route('**/api/content', (route) => route.fulfill({ json: content }));
  await page.goto('/');
  await expect(page.locator('.landing-tag')).toHaveText('A new signal.');
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await expect(page.locator('[data-panel="about"] h2')).toContainText('Behind the scenes');
  await page.locator('[data-i="1"]').click();
  // The entry itself opens on its own page; tests/app/blog.spec.js covers it.
  await expect(page.getByRole('link', { name: /From the workshop/ })).toHaveAttribute('href', '/blog/from-the-workshop');
  await page.locator('[data-i="2"]').click();
  const tile = page.getByRole('link', { name: /Pocket radio/ });
  await expect(tile).toHaveAttribute('href', 'https://example.com/radio');
  await expect(tile).toHaveAttribute('target', '_blank');
  // Measured once the slide has settled: while it moves in, the panel is scaled.
  await expect.poll(async () => (await tile.boundingBox()).height).toBeCloseTo(220, 0);
  expect((await tile.boundingBox()).width).toBeLessThanOrEqual(281);
  await tile.hover();
  await expect.poll(() => tile.evaluate((el) => Number(getComputedStyle(el).scale))).toBeGreaterThan(1.03);
  expect(await tile.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
  await page.context().route('https://example.com/radio', (route) => route.fulfill({ body: '<title>Project destination</title>' }));
  const opened = page.waitForEvent('popup');
  await tile.click();
  const destination = await opened;
  await destination.waitForLoadState();
  expect(destination.url()).toBe('https://example.com/radio');
});

test('projects wait for the published list, keep the owner order, and survive a missing upload', async ({ page }) => {
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ3sAAAAASUVORK5CYII=', 'base64');
  const content = initialContent();
  content.projects = [
    { ...emptyProject, id: 'second', title: 'Placed first', description: 'The owner moved this up.', status: 'published', url: 'https://example.com/first', image: '/uploads/decorative.png', mediaDecorative: true },
    { ...emptyProject, id: 'first', title: 'Placed second', description: 'Its logo is gone.', status: 'published', url: 'https://example.com/second', image: '/uploads/missing.png', imageAlt: 'Placed second logo' },
  ];
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  await page.route('**/api/content', async (route) => {
    await held;
    await route.fulfill({ json: content });
  });
  await page.route('**/uploads/decorative.png', (route) => route.fulfill({ contentType: 'image/png', body: pixel }));
  await page.route('**/uploads/missing.png', (route) => route.fulfill({ status: 502, body: '' }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await page.locator('[data-i="2"]').click();
  const panel = page.locator('[data-panel="projects"]');
  // Before the list arrives: a loading line, never the bundled sample projects.
  await expect(panel.locator('.proj')).toContainText('Loading projects…');
  await expect(panel.locator('.proj')).toHaveAttribute('aria-busy', 'true');
  await expect(panel.locator('.project-record')).toHaveCount(0);
  release();
  await expect(panel.locator('.project-flip')).toHaveCount(2);
  await expect(panel.locator('.proj')).toHaveAttribute('aria-busy', 'false');
  expect(await panel.locator('.project-flip').evaluateAll((tiles) => tiles.map((tile) => tile.getAttribute('aria-label')?.split(':')[0]))).toEqual(['Placed first', 'Placed second']);
  await expect(panel.locator('.project-logo').first()).toHaveAttribute('alt', '');
  // A failed upload falls back to the site logo instead of a broken image.
  const fallback = panel.locator('.project-logo').nth(1);
  await expect.poll(() => fallback.evaluate((image) => image.src)).toContain('koreokorp-logo-cutout');
  await expect.poll(() => fallback.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
});

test('phone project tiles stay compact and open their destination on the first tap', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const content = initialContent();
  content.projects = [{ id: 'radio', title: 'Pocket radio', description: 'A project from the workshop.', status: 'published', image: '', imageAlt: '', url: 'https://example.com/radio' }];
  await context.route('**/api/content', (route) => route.fulfill({ json: content }));
  await context.route('https://example.com/radio', (route) => route.fulfill({ body: '<title>Project destination</title>' }));
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await page.locator('[data-i="2"]').click();
  const tile = page.getByRole('link', { name: /Pocket radio/ });
  await expect(tile).toBeVisible();
  await page.waitForTimeout(700);
  const bounds = await tile.boundingBox();
  expect(bounds.width).toBeLessThanOrEqual(280);
  expect(bounds.height).toBeCloseTo(220, 0);
  const opened = page.waitForEvent('popup');
  await tile.tap();
  const destination = await opened;
  await destination.waitForLoadState();
  expect(destination.url()).toBe('https://example.com/radio');
  await context.close();
});
