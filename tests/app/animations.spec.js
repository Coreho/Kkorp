import { expect, test } from '@playwright/test';

/**
 * Regression coverage for the visible animation pass.
 *
 * The owner's complaint had two halves: the expected animation changes were
 * missing from the application, and the jelly froze in a malformed state when
 * reduced motion was on. Both failures are silent to a DOM assertion. A class
 * in the stylesheet that no element wears still exists; a canvas that paints a
 * single collapsed frame still exists. These tests therefore assert rendered
 * output: computed transforms and running keyframes on the elements that
 * actually wear them, and painted canvas pixels replayed through the owner's
 * landing → About → Blog → Projects → Lobby route under both motion settings.
 */

/** Enter the site and wait for the swarm to dock. */
async function enter(page) {
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await expect(page.locator('.panel.open')).toHaveAttribute(
    'data-panel',
    'about',
  );
  await page.waitForTimeout(1600);
}

/**
 * Bounding box of painted canvas pixels inside a rectangle.
 *
 * Reading pixels rather than elements is the only way to catch a jelly that is
 * present in the DOM but drawn at the wrong place or size.
 */
async function paintedBounds(page, {
  minX = 0,
  maxX = Infinity,
  minY = 0,
  maxY = Infinity,
} = {}) {
  return page.evaluate(
    ([startX, endX, startY, endY]) => {
      const canvas = document.querySelector('canvas.pixelfield');
      const ctx = canvas.getContext('2d');
      const { width, height } = canvas;
      const { data } = ctx.getImageData(0, 0, width, height);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -1;
      let y1 = -1;
      const xStop = Math.min(width, endX);
      const yStop = Math.min(height, endY);
      for (let y = startY; y < yStop; y++) {
        for (let x = startX; x < xStop; x++) {
          if (data[(y * width + x) * 4 + 3] > 40) {
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x);
            y1 = Math.max(y1, y);
          }
        }
      }
      return x1 < 0
        ? null
        : { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2 };
    },
    [minX, maxX, minY, maxY],
  );
}

/** Computed transform of one project card's inner wrapper. */
async function innerTransform(page, index = 0) {
  return page.evaluate((i) => {
    const card = document.querySelectorAll(
      '[data-panel="projects"] .project-flip',
    )[i];
    return card
      ? getComputedStyle(card.querySelector('.project-flip-inner')).transform
      : 'none';
  }, index);
}

/**
 * Degrees of Y rotation a computed transform represents.
 *
 * A rotateY on an element whose 3D context is flattened serialises as
 * `matrix(-1, 0, 0, 1, 0, 0)` rather than `matrix3d`, so both forms are read:
 * the first entry is cos(theta) either way, and the settled half turn reads as
 * ~180 instead of as a string that has to be guessed at.
 */
function rotateYDegrees(transform) {
  if (!transform || transform === 'none') return 0;
  const m11 = Number.parseFloat(transform.replace(/^(matrix3d|matrix)\(/, ''));
  if (Number.isNaN(m11)) return 0;
  const cos = Math.max(-1, Math.min(1, m11));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Every animation the document knows about, with its keyframes name. */
async function animations(page) {
  return page.evaluate(() =>
    document.getAnimations().map((a) => ({
      name: a.animationName ?? '',
      pseudo: a.effect?.pseudoElement ?? '',
      state: a.playState,
    })),
  );
}

/**
 * Seek a named animation to a fixed time and read a computed style.
 *
 * Sampling the clock twice would race the animation's phase; seeking is
 * deterministic and still proves the keyframes drive a rendered property.
 */
async function seek(page, name, ms, selector, pseudo, property) {
  return page.evaluate(
    ([n, time, sel, ps, prop]) => {
      const anim = document
        .getAnimations()
        .find(
          (a) =>
            a.animationName === n && (a.effect?.pseudoElement ?? '') === ps,
        );
      if (!anim) return null;
      anim.pause();
      anim.currentTime = time;
      return getComputedStyle(
        document.querySelector(sel),
        ps || null,
      ).getPropertyValue(prop);
    },
    [name, ms, selector, pseudo, property],
  );
}

test.describe('visible animations', () => {
  test('project cards are real flip cards that flip on hover and back on leave', async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await enter(page);
    await page.locator('[data-i="2"]').click();
    await page.waitForTimeout(1400);

    const cards = page.locator('[data-panel="projects"] .project-flip');
    await expect(cards).toHaveCount(3);

    const content = await page.evaluate(() => {
      const card = document.querySelector(
        '[data-panel="projects"] .project-flip',
      );
      return {
        tag: card.tagName,
        label: card.getAttribute('aria-label'),
        front: card.querySelector('.project-front')?.textContent ?? '',
        back: card.querySelector('.project-back')?.textContent ?? '',
        backDisplay: getComputedStyle(
          card.querySelector('.project-back'),
        ).display,
        frontBackface: getComputedStyle(
          card.querySelector('.project-front'),
        ).backfaceVisibility,
      };
    });
    expect(content.tag).toBe('BUTTON');
    expect(content.label).toContain('KoreoKorp V2');
    expect(content.front).toContain('KoreoKorp V2');
    expect(content.back).toContain('Next.js');
    expect(content.backDisplay).not.toBe('none');
    expect(content.frontBackface).toBe('hidden');

    // At rest the card shows its front.
    expect(rotateYDegrees(await innerTransform(page))).toBeLessThan(1);

    // Hover rotates the rendered card to its back face.
    await cards.first().hover();
    await expect
      .poll(async () => rotateYDegrees(await innerTransform(page)))
      .toBeGreaterThan(170);

    // The half turn is what the viewer actually sees: the hit test lands on
    // the back face and no longer on the front.
    const facing = await page.evaluate(() => {
      const card = document.querySelector(
        '[data-panel="projects"] .project-flip',
      );
      const box = card.getBoundingClientRect();
      const el = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );
      return {
        back: Boolean(el?.closest('.project-back')),
        front: Boolean(el?.closest('.project-front')),
      };
    });
    expect(facing.back).toBe(true);
    expect(facing.front).toBe(false);

    // Leaving flips it back, so a card is never left showing its reverse.
    await page.mouse.move(10, 10);
    await expect
      .poll(async () => rotateYDegrees(await innerTransform(page)))
      .toBeLessThan(1);

    expect(errors).toEqual([]);
  });

  test('the landing ring, tagline and open panel wear running keyframes', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await expect
      .poll(async () => (await animations(page)).map((a) => a.name))
      .toContain('kk-breathe-text');

    // On the landing the breathing tagline is the visible one. The orbit ring
    // is not: HomeHit carries the `hidden` attribute until the visitor enters,
    // and a display:none element has no animation to list.
    expect(
      await page.evaluate(
        () =>
          getComputedStyle(document.querySelector('.landing-tag')).animationName,
      ),
    ).toBe('kk-breathe-text');

    // Halfway through its cycle the tagline is scaled up. A class nothing
    // wears could never move this property.
    expect(
      Number.parseFloat(
        await seek(page, 'kk-breathe-text', 2000, '.landing-tag', '', 'scale'),
      ),
    ).toBeCloseTo(1.035, 2);

    await enter(page);

    // Once entered, the docked logo's orbit ring exists and runs, and the open
    // panel pulses its border.
    await expect
      .poll(async () => (await animations(page)).map((a) => a.name))
      .toContain('kk-logo-orbit');
    expect(
      await page.evaluate(() => ({
        ring: getComputedStyle(
          document.querySelector('.home-hit'),
          '::before',
        ).animationName,
        panel: getComputedStyle(document.querySelector('.panel.open'))
          .animationName,
      })),
    ).toEqual({ ring: 'kk-logo-orbit', panel: 'kk-pulse-border' });

    expect(
      await seek(page, 'kk-logo-orbit', 2000, '.home-hit', '::before', 'rotate'),
    ).toBe('180deg');

    const atRest = await seek(
      page,
      'kk-pulse-border',
      0,
      '.panel.open',
      '',
      'border-top-color',
    );
    const atPeak = await seek(
      page,
      'kk-pulse-border',
      1600,
      '.panel.open',
      '',
      'border-top-color',
    );
    expect(atRest).not.toBe(atPeak);
  });

  test('reduced motion stops the added animations and leaves cards unflipped', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/');

    const declared = await page.evaluate(() => ({
      ring: getComputedStyle(
        document.querySelector('.home-hit'),
        '::before',
      ).animationName,
      tag: getComputedStyle(document.querySelector('.landing-tag'))
        .animationName,
    }));
    expect(declared.ring).toBe('none');
    expect(declared.tag).toBe('none');

    await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
    await expect(page.locator('.panel.open')).toHaveAttribute(
      'data-panel',
      'about',
    );
    await page.waitForTimeout(800);

    expect(
      await page.evaluate(
        () =>
          getComputedStyle(document.querySelector('.panel.open')).animationName,
      ),
    ).toBe('none');
    // The entry transitions finish at slightly different times under CI load,
    // so wait for the page to settle rather than sampling one instant.
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            document.getAnimations().filter((a) => a.playState === 'running')
              .length,
        ),
      )
      .toBe(0);

    await page.locator('[data-i="2"]').click();
    await page.waitForTimeout(800);

    const card = page.locator('[data-panel="projects"] .project-flip').first();
    await card.hover();
    await page.waitForTimeout(900);

    const state = await page.evaluate(() => {
      const el = document.querySelector('[data-panel="projects"] .project-flip');
      return {
        inner: getComputedStyle(el.querySelector('.project-flip-inner'))
          .transform,
        magnet: getComputedStyle(el).transform,
        backDisplay: getComputedStyle(el.querySelector('.project-back')).display,
        label: el.getAttribute('aria-label'),
      };
    });
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(state.inner);
    // The build's CSS optimiser rewrites `transform: none` to the equivalent
    // `translate(0, 0) scale(1)`, so the identity matrix is the correct
    // reduced-motion value; what matters is that nothing is displaced.
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(state.magnet);
    expect(state.backDisplay).toBe('none');
    expect(state.label).toContain('KoreoKorp V2');

    expect(errors).toEqual([]);
    await context.close();
  });

  test('the cards are keyboard reachable, ringed, and flip on focus', async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await enter(page);

    // Move to Projects the way a keyboard user would.
    await page.locator('#cnav button[data-i="2"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.panel.open')).toHaveAttribute(
      'data-panel',
      'projects',
    );
    await page.waitForTimeout(600);

    const focused = () =>
      page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        const style = getComputedStyle(el);
        return {
          card: el.classList?.contains('project-flip') ?? false,
          focusVisible: el.matches(':focus-visible'),
          outline: style.outlineStyle,
          outlineWidth: Number.parseFloat(style.outlineWidth),
          label: el.getAttribute?.('aria-label') ?? '',
        };
      });

    let reached = null;
    for (let i = 0; i < 80 && !reached; i++) {
      await page.keyboard.press('Tab');
      const info = await focused();
      if (info?.card) reached = info;
    }
    expect(reached, 'the first project card should be reachable by Tab').not.toBeNull();
    expect(reached.focusVisible).toBe(true);
    expect(reached.outline).not.toBe('none');
    expect(reached.outlineWidth).toBeGreaterThan(0);
    expect(reached.label).toContain('KoreoKorp V2');

    // Focus-visible flips the card, so the keyboard path discovers the back.
    await expect
      .poll(async () => rotateYDegrees(await innerTransform(page)))
      .toBeGreaterThan(170);

    // Activating it must not navigate or throw: it is a button, not a link.
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await expect(page.locator('.panel.open')).toHaveAttribute(
      'data-panel',
      'projects',
    );
    expect(errors).toEqual([]);
  });

  test('replaying landing → About → Blog → Projects → Lobby keeps the jelly docked', async ({
    browser,
  }) => {
    // Both motion settings replay the owner's route: the reduced-motion pass is
    // the one that used to freeze the logo and the panel icon.
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const context = await browser.newContext({
        reducedMotion,
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto('/');

      // Landing: the large logo is settled and centred, not a seed speck.
      await expect
        .poll(async () => (await paintedBounds(page))?.w ?? 0)
        .toBeGreaterThan(700);

      await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
      await expect(page.locator('.panel.open')).toHaveAttribute(
        'data-panel',
        'about',
      );

      for (const [index, panel] of [
        [0, 'about'],
        [1, 'blog'],
        [2, 'projects'],
        [3, 'chat'],
      ]) {
        if (index > 0) {
          await page.locator(`[data-i="${index}"]`).click();
        }
        await expect(page.locator('.panel.open')).toHaveAttribute(
          'data-panel',
          panel,
        );
        // The jelly animates under both motion settings (owner decision), so both
        // passes need the springs to settle.
        await page.waitForTimeout(2600);

        // The docked logo lives in the centre column of the top band, centred
        // and about 162px wide. Only the logo paints there; the panel icon sits
        // lower or off to one side (the Lobby's bubble is top-left, which is
        // why the whole top band cannot be measured). A frozen seed frame or a
        // blob left at an old placement fails these bounds.
        const logo = await paintedBounds(page, {
          minX: 460,
          maxX: 820,
          minY: 0,
          maxY: 100,
        });
        expect(logo, `${panel} (${reducedMotion}): the docked logo should paint`).not.toBeNull();
        expect(logo.w).toBeGreaterThan(120);
        expect(logo.w).toBeLessThan(230);
        expect(Math.abs(logo.cx - 640)).toBeLessThan(40);
        expect(logo.y0).toBeLessThan(40);
        expect(logo.y1).toBeGreaterThan(45);

        // The slide's own icon must also be painted: the full-canvas bounds
        // reach past the logo alone in every section.
        const overall = await paintedBounds(page);
        expect(overall, `${panel} (${reducedMotion}): the panel icon should paint`).not.toBeNull();
        expect(overall.w).toBeGreaterThan(250);
        expect(overall.h).toBeGreaterThan(90);
      }

      expect(errors).toEqual([]);
      await context.close();
    }
  });
});