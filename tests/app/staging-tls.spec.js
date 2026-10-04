import { expect, test } from '@playwright/test';

/**
 * Runs against public staging over trusted TLS rather than a local server.
 *
 * This is the rehearsal TASK-016 AC#3 asks for: the same assertions that pass
 * against the local build must also pass through Nginx Proxy Manager, a real
 * Let's Encrypt certificate and the public internet. It is skipped unless
 * KOREOKORP_STAGING=1, because the rest of the suite must not depend on the
 * staging host existing.
 */
const base = process.env.KOREOKORP_STAGING_BASE ?? 'https://staging.koreokorp.com';
test.skip(
  process.env.KOREOKORP_STAGING !== '1',
  'set KOREOKORP_STAGING=1 to exercise the public staging host',
);

test('landing renders and the carousel navigates over TLS', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(base);
  await expect(page).toHaveTitle('KoreoKorp V2 Mockup');
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await expect(page.locator('.panel.open')).toHaveAttribute('data-panel', 'about');

  for (const [i, p] of ['about','blog','projects','chat'].entries()) {
    await page.locator(`[data-i="${i}"]`).click();
    await expect(page.locator(`[data-i="${i}"]`)).toHaveAttribute('aria-current', 'true');
    await expect(page.locator(`[data-panel="${p}"]`)).toHaveAttribute('aria-hidden', 'false');
  }
  expect(errors).toEqual([]);
});

test('chat signs on and sends over TLS', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base);
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await page.locator('[data-i="3"]').click();

  await page.getByLabel('Screen name').fill('StagingKid');
  await page.getByRole('button', { name: 'Sign On' }).click();
  await expect(page.locator('#whoami')).toHaveText('Signed on as StagingKid');

  const msg = page.getByLabel('Message');
  await msg.fill('hello from staging');
  await msg.press('Enter');
  await expect(page.locator('#log')).toContainText('StagingKid: hello from staging');
  expect(errors).toEqual([]);
});
