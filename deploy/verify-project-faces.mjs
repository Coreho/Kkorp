import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.PROJECT_VERIFY_BASE || 'http://127.0.0.1:4181';
const content = await (await fetch('https://koreokorp.com/api/content')).json();
const browser = await chromium.launch();
const output = process.env.PROJECT_VERIFY_OUTPUT || '.impeccable/review';
await mkdir(output, { recursive: true });
try {
  for (const mobile of process.env.PROJECT_VERIFY_MOBILE_ONLY ? [true] : [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, hasTouch: mobile });
    const page = await context.newPage();
    if (content.projects[0].url) await context.route(content.projects[0].url, (route) => route.fulfill({ body: '<title>Project destination</title>' }));
    await page.route('**/api/content', (route) => route.fulfill({ json: content }));
    await page.goto(base);
    await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
    await page.locator('[data-i="2"]').click();
    const card = page.locator('.project-flip').first();
    await expect(card.locator('.project-front')).toHaveText('');
    await expect(card.locator('.project-front img')).toHaveCount(1);
    await expect.poll(() => card.locator('img').evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(card.locator('.project-back')).toHaveText(content.projects[0].description);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(1000);
    const bounds = await card.boundingBox();
    expect(bounds.width).toBeLessThanOrEqual(281);
    expect(bounds.height).toBeCloseTo(220, 0);
    await page.screenshot({ path: `${output}/projects-logo-${mobile ? 'mobile' : 'desktop'}-front.png` });
    await card.hover();
    if (mobile) {
      await expect(card.locator('.project-back')).toBeVisible();
      await expect(card.locator('.project-front')).toBeHidden();
    } else {
      await expect.poll(() => card.locator('.project-flip-inner').evaluate((element) => getComputedStyle(element).transform)).toMatch(/^matrix3d\(-1,/);
    }
    await page.waitForTimeout(900);
    if (!mobile) {
      const hover = await card.evaluate((el) => ({ scale: getComputedStyle(el).scale, shadow: getComputedStyle(el).boxShadow }));
      expect(Number(hover.scale)).toBeGreaterThan(1.03);
      expect(hover.shadow).not.toBe('none');
    }
    if (process.env.PROJECT_VERIFY_DEBUG) console.log(await page.locator('.p3 h2').evaluate((heading) => ({
      heading: heading.textContent, opacity: getComputedStyle(heading).opacity,
      bounds: heading.getBoundingClientRect().toJSON(), scroll: heading.parentElement.scrollTop,
      animation: getComputedStyle(heading).animationName,
      color: getComputedStyle(heading).color, background: getComputedStyle(heading).backgroundImage,
      visibility: getComputedStyle(heading).visibility, transform: getComputedStyle(heading).transform,
      hit: document.elementFromPoint(100, 170)?.outerHTML.slice(0, 300),
      parents: Array.from((function* () { for (let p = heading.parentElement; p; p = p.parentElement) yield p; })()).map((p) => ({ c: p.className, opacity: getComputedStyle(p).opacity, transform: getComputedStyle(p).transform, scroll: p.scrollTop })),
    })));
    await page.screenshot({ path: `${output}/projects-logo-${mobile ? 'mobile' : 'desktop'}-back.png` });
    if (mobile) {
      await page.locator('.p3 h2').screenshot({ path: `${output}/projects-mobile-heading.png` });
      await card.screenshot({ path: `${output}/projects-mobile-description.png` });
    }
    if (content.projects[0].url) {
      await expect(card).toHaveAttribute('href', content.projects[0].url);
      const opened = page.waitForEvent('popup');
      if (mobile) await card.tap();
      else await card.click();
      const destination = await opened;
      await destination.waitForLoadState();
      expect(destination.url()).toBe(content.projects[0].url);
      await destination.close();
    }
    await context.close();
  }
  console.log('Compact project tiles, logo fronts, description backs, and click/tap navigation verified on desktop and phone.');
} finally {
  await browser.close();
}
