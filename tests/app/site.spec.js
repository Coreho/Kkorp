import { expect, test } from '@playwright/test';

/**
 * Mirrors tests/smoke.spec.js against the application.
 *
 * The prototype suite pins the contracts the port must not break: the title,
 * the ids, the role names, aria-current/aria-hidden, the kk_sn localStorage key
 * and the 390px no-overflow rule. Running the same assertions here is what makes
 * the port verifiable rather than merely plausible.
 */

async function openSite(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  await page.goto('/');
  return errors;
}

async function enterSite(page) {
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await expect(page.locator('.panel.open')).toHaveAttribute('data-panel', 'about');
  await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible();
}

test('landing, carousel navigation, keyboard controls, and return home', async ({ page }) => {
  const errors = await openSite(page);

  await expect(page).toHaveTitle('KoreoKorp V2 Mockup');
  await expect(page.locator('#landing')).not.toHaveClass(/gone/);

  await enterSite(page);

  for (const [index, panel] of ['about', 'blog', 'projects', 'chat'].entries()) {
    await page.locator(`[data-i="${index}"]`).click();
    await expect(page.locator(`[data-i="${index}"]`)).toHaveAttribute('aria-current', 'true');
    await expect(page.locator(`[data-panel="${panel}"]`)).toHaveClass(/open/);
    await expect(page.locator(`[data-panel="${panel}"]`)).toHaveAttribute('aria-hidden', 'false');
  }

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.panel.open')).toHaveAttribute('data-panel', 'chat');

  await page.keyboard.press('Escape');
  await expect(page.locator('#landing')).not.toHaveClass(/gone/);
  await expect(page.getByRole('navigation', { name: 'Sections' })).toBeHidden();

  expect(errors).toEqual([]);
});

test('chat validates screen names, signs on, sends text, and handles commands', async ({ page }) => {
  const errors = await openSite(page);
  await enterSite(page);

  await page.locator('[data-i="3"]').click();
  await expect(page.locator('.panel.open')).toHaveAttribute('data-panel', 'chat');

  const nameField = page.getByLabel('Screen name');
  await nameField.fill('x');
  await page.getByRole('button', { name: 'Sign On' }).click();
  await expect(page.locator('#snErr')).toContainText('3 to 16');

  await nameField.fill('TestKid');
  await page.getByRole('button', { name: 'Sign On' }).click();
  await expect(page.locator('#signon')).toBeHidden();
  await expect(page.locator('#whoami')).toHaveText('Signed on as TestKid');
  await expect(page.locator('#buddies')).toContainText('TestKid');

  const message = page.getByLabel('Message');
  await message.fill('hello from playwright');
  await message.press('Enter');
  await expect(page.locator('#log')).toContainText('TestKid: hello from playwright');

  await message.fill('/help');
  await message.press('Enter');
  await expect(page.locator('#log')).toContainText('Commands: /spell WORD');

  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('kk_sn')))
    .toBe('TestKid');

  expect(errors).toEqual([]);
});

test('phone layout fits the viewport and keeps every section reachable', async ({ page }) => {
  const errors = await openSite(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await enterSite(page);

  for (const index of [0, 1, 2, 3]) {
    await page.locator(`[data-i="${index}"]`).click();
    await expect(page.locator(`[data-i="${index}"]`)).toHaveAttribute('aria-current', 'true');
  }

  const widths = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(widths.body).toBe(widths.viewport);
  expect(widths.document).toBe(widths.viewport);

  expect(errors).toEqual([]);
});

test('health endpoint reports liveness without touching a database', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
});