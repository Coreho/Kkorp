import { test, expect } from '@playwright/test';
import { initialContent } from '../../mockups/koreokorp-v2/content-model.js';

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
