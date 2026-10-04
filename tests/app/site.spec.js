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
test('the jelly swarm paints the docked logo and nothing oversized', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = await openSite(page);

  await enterSite(page);
  // Let the logo glide up and dock, and the panel icon arrive.
  await page.waitForTimeout(3500);

  const painted = await page.evaluate(() => {
    const canvas = document.querySelector('canvas.pixelfield');
    const ctx = canvas.getContext('2d');
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 8) {
        count += 1;
      }
    }
    return { count, width: canvas.width, height: canvas.height };
  });

  // The swarm must have sized its canvas to the viewport, not the 300x150
  // default an un-initialised canvas keeps.
  expect(painted.width).toBe(1280);
  expect(painted.height).toBe(800);

  // Two shapes are visible: a 162px docked logo and a panel icon of a few
  // hundred pixels. A regression that drew a glyph at the canvas default font
  // size inside the scaled space filled the whole viewport with ~590k pixels;
  // an engine that failed to start painted nothing.
  expect(painted.count).toBeGreaterThan(20_000);
  expect(painted.count).toBeLessThan(200_000);

  expect(errors).toEqual([]);
});

test('the jelly icon moves to each slide and morphs between them', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = await openSite(page);
  await enterSite(page);

  /**
   * Bounding box of the swarm's icon, ignoring the docked header logo.
   *
   * Averaging colour across the canvas would be dominated by the blue logo and
   * by the panel behind it. The icon's position is what actually differs per
   * slide: About's cloud sits upper-right of the panel, Projects' computer
   * lower-right, the Lobby's bubble above the chat window.
   */
  const iconBox = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('canvas.pixelfield');
      const ctx = canvas.getContext('2d');
      const { width, height } = canvas;
      const { data } = ctx.getImageData(0, 0, width, height);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -1;
      let y1 = -1;
      for (let y = 120; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (data[(y * width + x) * 4 + 3] > 40) {
            if (x < x0) x0 = x;
            if (y < y0) y0 = y;
            if (x > x1) x1 = x;
            if (y > y1) y1 = y;
          }
        }
      }
      return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
    });

  const boxes = {};
  for (const [index, name] of [[0, 'about'], [1, 'blog'], [2, 'projects'], [3, 'chat']]) {
    await page.locator(`[data-i="${index}"]`).click();
    await page.waitForTimeout(3200);
    boxes[name] = await iconBox();
  }

  for (const name of ['about', 'blog', 'projects', 'chat']) {
    expect(boxes[name], `${name} icon should be painted`).not.toBeNull();
    // Each icon is a few hundred pixels across; anything near the viewport
    // width means a shape failed to scale to its placement.
    expect(boxes[name].w).toBeGreaterThan(60);
    expect(boxes[name].w).toBeLessThan(700);
  }

  // The four placements are genuinely different places on the panel.
  const centres = Object.values(boxes).map((b) => `${Math.round((b.x0 + b.x1) / 2)},${Math.round((b.y0 + b.y1) / 2)}`);
  expect(new Set(centres).size).toBe(4);

  expect(errors).toEqual([]);
});
