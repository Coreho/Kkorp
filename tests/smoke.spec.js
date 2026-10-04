import { expect, test } from '@playwright/test';

async function openSite(page) {
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  return browserErrors;
}

async function enterSite(page) {
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await expect(page.locator('.panel.open')).toHaveAttribute('data-panel', 'about');
  await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible();
}

test('landing, carousel navigation, keyboard controls, and return home', async ({ page }) => {
  const browserErrors = await openSite(page);
  await expect(page).toHaveTitle('KoreoKorp V2 Mockup');
  await expect(page.locator('#landing')).not.toHaveClass(/gone/);
  await enterSite(page);

  const sections = ['about', 'blog', 'projects', 'chat'];
  for (const [index, section] of sections.entries()) {
    const navButton = page.locator(`[data-i="${index}"]`);
    await navButton.click();
    await expect(navButton).toHaveAttribute('aria-current', 'true');
    await expect(page.locator(`[data-panel="${section}"]`)).toHaveClass(/open/);
    await expect(page.locator(`[data-panel="${section}"]`)).toHaveAttribute('aria-hidden', 'false');
  }

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-panel="about"]')).toHaveClass(/open/);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-panel="blog"]')).toHaveClass(/open/);

  await page.keyboard.press('Escape');
  await expect(page.locator('#landing')).not.toHaveClass(/gone/);
  await expect(page.getByRole('navigation', { name: 'Sections' })).toBeHidden();
  expect(browserErrors).toEqual([]);
});

test('chat validates screen names, signs on, sends text, and handles commands', async ({ page }) => {
  const browserErrors = await openSite(page);
  await enterSite(page);
  await page.locator('[data-i="3"]').click();

  const screenName = page.getByLabel('Screen name');
  await screenName.fill('x');
  await page.getByRole('button', { name: 'Sign On' }).click();
  await expect(page.locator('#snErr')).toContainText('3 to 16');

  await screenName.fill('TestKid');
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
  await expect.poll(() => page.evaluate(() => localStorage.getItem('kk_sn'))).toBe('TestKid');
  expect(browserErrors).toEqual([]);
});

test.describe('phone layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('fits the viewport and keeps every section reachable', async ({ page }) => {
    const browserErrors = await openSite(page);
    await enterSite(page);

    for (let index = 0; index < 4; index += 1) {
      await page.locator(`[data-i="${index}"]`).click();
      await expect(page.locator(`[data-i="${index}"]`)).toHaveAttribute('aria-current', 'true');
    }

    const dimensions = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(dimensions.body).toBe(dimensions.viewport);
    expect(dimensions.document).toBe(dimensions.viewport);
    expect(browserErrors).toEqual([]);
  });
});
