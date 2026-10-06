import { expect, test } from '@playwright/test';

/**
 * The canvas engines, other than the jelly swarm.
 *
 * These assertions exist because a canvas that silently fails to draw looks
 * exactly like one that is working: the page still passes every DOM and
 * interaction test while the background is blank. Each test therefore measures
 * painted pixels rather than checking that the element exists.
 */

/** Count pixels with any alpha above a threshold. */
async function paintedPixels(page, selector) {
  return page.evaluate((sel) => {
    const canvas = document.querySelector(sel);
    if (!canvas || !canvas.width || !canvas.height) {
      return -1;
    }
    const { data } = canvas.getContext('2d').getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    let count = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 8) {
        count += 1;
      }
    }
    return count;
  }, selector);
}

test('the background dot field sizes to the viewport and paints', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.waitForTimeout(1500);

  const sized = await page.evaluate(() => {
    const canvas = document.getElementById('dotfield');
    return { width: canvas.width, height: canvas.height };
  });
  // An un-initialised canvas keeps the 300x150 default.
  expect(sized.width).toBe(1280);
  expect(sized.height).toBe(800);

  const painted = await paintedPixels(page, '#dotfield');
  expect(painted).toBeGreaterThan(500);

  expect(errors).toEqual([]);
});

test('the blog page writes itself and the projects graph draws nodes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') {
      errors.push(m.text());
    }
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await page.waitForTimeout(1200);

  // One scene canvas is prepended into each of the Blog and Projects panels.
  const sceneCount = await page.locator('canvas.scene').count();
  expect(sceneCount).toBe(2);

  await page.locator('[data-i="1"]').click();
  await page.waitForTimeout(2500);
  const blogPainted = await paintedPixels(page, '.p2 canvas.scene');
  expect(blogPainted).toBeGreaterThan(5000);

  await page.locator('[data-i="2"]').click();
  await page.waitForTimeout(2500);
  const graphPainted = await paintedPixels(page, '.p3 canvas.scene');
  expect(graphPainted).toBeGreaterThan(5000);

  expect(errors).toEqual([]);
});

test('the Lobby dot matrix ripples when a message is sent', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await page.locator('[data-i="3"]').click();
  await page.waitForTimeout(1500);

  const before = await paintedPixels(page, '#dots');
  expect(before).toBeGreaterThan(200);

  await page.getByLabel('Screen name').fill('RippleKid');
  await page.getByRole('button', { name: 'Sign On' }).click();
  await page.getByLabel('Message').fill('make a ripple');
  await page.getByLabel('Message').press('Enter');
  // The ripple expands over ~1.8s, so sample mid-flight.
  await page.waitForTimeout(400);

  const during = await paintedPixels(page, '#dots');
  expect(during).toBeGreaterThan(0);

  expect(errors).toEqual([]);
});

test('the screensaver starts on command, animates, and wakes on input', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') {
      errors.push(m.text());
    }
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await page.locator('[data-i="3"]').click();
  await page.waitForTimeout(1000);
  await page.getByLabel('Screen name').fill('SaverKid');
  await page.getByRole('button', { name: 'Sign On' }).click();

  await page.getByLabel('Message').fill('/screensaver');
  await page.getByLabel('Message').press('Enter');
  await page.waitForTimeout(2000);

  const shown = await page.evaluate(() => {
    const el = document.getElementById('saver');
    return { hidden: el.hidden, on: el.classList.contains('on') };
  });
  expect(shown.hidden).toBe(false);
  expect(shown.on).toBe(true);

  // The wordmark is rasterised into pixels, so the canvas must not be blank.
  const painted = await paintedPixels(page, '#saverCanvas');
  expect(painted).toBeGreaterThan(10_000);

  // The wordmark travels and leaves a fading trail, so a checksum over the
  // whole canvas must change between two samples. Sampling a fixed corner
  // proves nothing: it is usually empty background.
  const checksum = () =>
    page.evaluate(() => {
      const canvas = document.getElementById('saverCanvas');
      const { data } = canvas
        .getContext('2d')
        .getImageData(0, 0, canvas.width, canvas.height);
      let sum = 0;
      // Stride over the buffer so this stays cheap.
      for (let i = 0; i < data.length; i += 997) {
        sum = (sum * 31 + data[i]) >>> 0;
      }
      return sum;
    });
  const first = await checksum();
  await page.waitForTimeout(1200);
  const second = await checksum();
  expect(first).not.toBe(second);

  // Any input wakes it, and the waking click must not reach the page beneath.
  await page.mouse.move(600, 400);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(1200);
  await expect(page.locator('#saver')).toBeHidden();

  expect(errors).toEqual([]);
});
test('chat commands and the Konami code reach the front-page caption', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') {
      errors.push(m.text());
    }
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await page.locator('[data-i="3"]').click();
  await page.waitForTimeout(800);

  // The About caption is rendered by React from the store, but driven by the
  // jelly engine. It is the visible proof that a chat command reached the swarm.
  const caption = () =>
    page.locator('.panel[data-panel="about"] .detail .now').first().textContent();

  await page.getByLabel('Screen name').fill('Coupler');
  await page.getByRole('button', { name: 'Sign On' }).click();
  await page.waitForTimeout(600);
  expect(await caption()).toContain('Welcome to The Lobby');
  expect(await caption()).toContain('Coupler');

  await page.getByLabel('Message').fill('/spell hello');
  await page.getByLabel('Message').press('Enter');
  await page.waitForTimeout(800);
  expect(await caption()).toContain('HELLO');

  // The secret: up up down down left right left right B A.
  await page.locator('[data-i="0"]').click();
  await page.waitForTimeout(600);
  for (const key of [
    'ArrowUp',
    'ArrowUp',
    'ArrowDown',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowLeft',
    'ArrowRight',
    'b',
    'a',
  ]) {
    await page.keyboard.press(key);
  }
  await page.waitForTimeout(2500);
  expect(await caption()).toContain('Secret unlocked');

  expect(errors).toEqual([]);
});

test('reduced motion keeps the jelly animating and the site usable', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const paintedBounds = (minY = 0) =>
    page.evaluate((startY) => {
      const canvas = document.querySelector('canvas.pixelfield');
      const ctx = canvas.getContext('2d');
      const { width, height } = canvas;
      const { data } = ctx.getImageData(0, 0, width, height);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -1;
      let y1 = -1;
      for (let y = startY; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (data[(y * width + x) * 4 + 3] > 40) {
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x);
            y1 = Math.max(y1, y);
          }
        }
      }
      return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
    }, minY);

  // The landing logo still rises and settles at its full size.
  await expect.poll(async () => (await paintedBounds())?.w ?? 0).toBeGreaterThan(700);
  await expect.poll(async () => (await paintedBounds())?.h ?? 0).toBeGreaterThan(150);

  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await expect.poll(async () => (await paintedBounds(120))?.w ?? 0).toBeGreaterThan(220);

  const sample = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('canvas.pixelfield');
      const { data } = canvas
        .getContext('2d')
        .getImageData(0, 0, canvas.width, canvas.height);
      let sum = 0;
      for (let i = 0; i < data.length; i += 997) {
        sum = (sum * 31 + data[i]) >>> 0;
      }
      return sum;
    });

  // Owner decision 2026-10-06: the jelly is the site's signature motion and
  // animates regardless of the preference, so the frame must keep changing.
  // The CSS decoration still collapses under the same preference, which
  // tests/app/animations.spec.js pins.
  const first = await sample();
  expect(first).not.toBe(0);
  await expect.poll(sample).not.toBe(first);

  // Navigation still repositions the shapes, and the site stays usable.
  await page.locator('[data-i="2"]').click();
  await expect.poll(async () => (await paintedBounds(120))?.h ?? 0).toBeGreaterThan(150);

  await expect(page.locator('[data-i="2"]')).toHaveAttribute('aria-current', 'true');
  expect(errors).toEqual([]);
});
