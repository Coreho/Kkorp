/**
 * Capture TASK-006 evidence: the site at desktop and phone widths in every
 * state the design review covers, plus the measurements its findings rest on.
 *
 *   node scripts/site-audit-capture.mjs                       # https://koreokorp.com
 *   AUDIT_BASE=http://127.0.0.1:4180 node scripts/site-audit-capture.mjs
 *
 * Writes JPEG screenshots and measurements.json to docs/evidence/site-audit/.
 * The "populated" and "empty" states replace /api/content inside the browser
 * only; nothing is written to the content service.
 */

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { decodePng, regionContrast, relativeLuminance } from '../tests/app/png.js';

const base = process.env.AUDIT_BASE ?? 'https://koreokorp.com';
const out = 'docs/evidence/site-audit';
const widths = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
];
const panelIds = ['about', 'blog', 'projects', 'chat'];

const live = await (await fetch(new URL('/api/content', base))).json();
const image = live.projects.find((project) => project.image)?.image ?? '';
const populated = {
  ...live,
  posts: [
    { id: 'p1', slug: 'notes-from-the-workshop', title: 'Notes from the workshop', date: '2026-10-20', excerpt: 'What changed this month, and what did not.', body: 'First paragraph.\n\n## A heading\n\nA **bold** idea, a [link](https://example.com), and a list:\n\n- one\n- two', image: '', imageAlt: '', status: 'published' },
    { id: 'p2', slug: 'a-very-long-title', title: 'A very long entry title that keeps going to see how the list and the entry page wrap it', date: '2026-10-12', excerpt: 'A long introduction that runs over more than one line, so the list has to decide how much of it to show before the next entry starts.', body: 'Body.', image: '', imageAlt: '', status: 'published' },
    { id: 'p3', slug: 'short', title: 'Short', date: '2026-09-30', excerpt: '', body: 'Body.', image: '', imageAlt: '', status: 'published' },
    { id: 'p4', slug: 'september', title: 'September', date: '2026-09-02', excerpt: 'An older entry.', body: 'Body.', image: '', imageAlt: '', status: 'published' },
  ],
  projects: [
    ...live.projects,
    ...['Radio', 'Signal map', 'A project with a much longer name than the others', 'Lobby bots', 'Pixel board'].map((title, index) => ({
      id: `extra-${index}`, title, description: `${title}: a short description of the work.`, url: index % 2 ? 'https://example.com' : '', image: index < 3 ? image : '', imageAlt: index < 3 ? `${title} logo` : '', status: 'published',
    })),
  ],
};
const empty = { ...live, posts: [], projects: [] };

const report = { base, captured: new Date().toISOString(), states: {} };
await mkdir(out, { recursive: true });
const browser = await chromium.launch();

async function open(viewport, { content, reducedMotion = 'no-preference', deviceScaleFactor = 1 } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(String(error)));
  if (content) await page.route('**/api/content', (route) => route.fulfill({ json: content }));
  page.errors = errors;
  return page;
}

async function enter(page) {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await page.waitForTimeout(2600);
}

async function show(page, index) {
  // The screensaver starts after 25 s without input and covers the page; any movement wakes it.
  await page.mouse.move(4 + index, 4);
  await page.waitForTimeout(800);
  await page.locator(`#cnav button[data-i="${index}"]`).click();
  await page.waitForTimeout(1600);
}

/** Layout facts for the open panel: overflow, hidden content, space used, small targets. */
async function layout(page, id) {
  return page.evaluate((panelId) => {
    const panel = document.querySelector(`[data-panel="${panelId}"]`);
    const inner = panel?.querySelector('.inner');
    if (!panel || !inner) return null;
    const box = inner.getBoundingClientRect();
    let bottom = box.top;
    for (const child of inner.children) {
      const rect = child.getBoundingClientRect();
      if (rect.height && getComputedStyle(child).display !== 'none') bottom = Math.max(bottom, rect.bottom);
    }
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height || element.closest('[aria-hidden="true"], [hidden]')) return false;
      const style = getComputedStyle(element);
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    };
    const name = (element) => (element.getAttribute('aria-label') || element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const targets = [...document.querySelectorAll('a[href], button, input, textarea, select')].filter(visible).map((element) => {
      const rect = element.getBoundingClientRect();
      return { name: name(element), width: Math.round(rect.width), height: Math.round(rect.height) };
    });
    return {
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      panel: { width: Math.round(box.width), height: Math.round(box.height) },
      contentHiddenBelow: Math.max(0, Math.round(inner.scrollHeight - inner.clientHeight)),
      usedHeightShare: Math.round(((Math.min(bottom, box.bottom) - box.top) / box.height) * 100),
      smallTargets: targets.filter((target) => target.width < 44 || target.height < 44),
    };
  }, id);
}

/**
 * Contrast of the first visible match of each selector, two ways. "rendered"
 * compares the darkest and lightest rendered pixels in the box, which reads
 * thin or small text low because antialiasing never reaches full ink. "text"
 * compares the element's computed colour with the box's median pixel, which
 * stands in for the background because most pixels in a text box are background.
 */
async function contrast(page, selectors) {
  const png = decodePng(await page.screenshot({ type: 'png' }));
  const results = {};
  for (const selector of selectors) {
    const element = page.locator(selector).filter({ visible: true }).first();
    if (!(await element.count())) continue;
    const box = await element.boundingBox();
    if (!box || box.width < 4 || box.height < 4) continue;
    try {
      const rendered = regionContrast(png, box);
      const [r, g, b] = (await element.evaluate((node) => getComputedStyle(node).color)).match(/[\d.]+/g).map(Number);
      const lums = [];
      for (let y = Math.floor(box.y); y < Math.min(png.height, box.y + box.height); y += 1) {
        for (let x = Math.floor(box.x); x < Math.min(png.width, box.x + box.width); x += 1) {
          const i = (y * png.width + x) * 4;
          lums.push(relativeLuminance({ r: png.data[i], g: png.data[i + 1], b: png.data[i + 2] }));
        }
      }
      lums.sort((x, y) => x - y);
      const background = lums[Math.floor(lums.length / 2)];
      const ink = relativeLuminance({ r, g, b });
      results[selector] = {
        rendered: Number(rendered.ratio.toFixed(2)),
        text: Number(((Math.max(ink, background) + 0.05) / (Math.min(ink, background) + 0.05)).toFixed(2)),
      };
    } catch { /* too small to measure */ }
  }
  return results;
}

async function shot(page, name) {
  await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 72 });
}

const textSelectors = {
  about: ['[data-panel="about"] .eyebrow', '[data-panel="about"] .blurb', '[data-panel="about"] .long', '[data-panel="about"] .tl li', '[data-panel="about"] .links li'],
  blog: ['[data-panel="blog"] .blurb', '[data-panel="blog"] .latest', '[data-panel="blog"] .post-list li', '[data-panel="blog"] .admin-note'],
  projects: ['[data-panel="projects"] .blurb', '[data-panel="projects"] .project-record'],
  chat: ['[data-panel="chat"] .blurb'],
};

for (const viewport of widths) {
  const w = viewport.name;

  // Live content, every panel.
  let page = await open(viewport);
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await shot(page, `${w}-landing`);
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await page.waitForTimeout(2600);
  for (const [index, id] of panelIds.entries()) {
    await show(page, index);
    await shot(page, `${w}-live-${id}`);
    report.states[`${w}-live-${id}`] = { ...(await layout(page, id)), contrast: await contrast(page, [...textSelectors[id], '#cnav button[aria-current="true"]', '#cnav button[aria-current="false"] b']) };
  }
  report.states[`${w}-live`] = { consoleErrors: page.errors };
  await page.context().close();

  // Populated and empty content, Blog and Projects, plus an entry page.
  for (const [label, content] of [['populated', populated], ['empty', empty]]) {
    page = await open(viewport, { content });
    await enter(page);
    for (const index of [1, 2]) {
      await show(page, index);
      await shot(page, `${w}-${label}-${panelIds[index]}`);
      report.states[`${w}-${label}-${panelIds[index]}`] = await layout(page, panelIds[index]);
    }
    if (label === 'populated') {
      for (const slug of ['notes-from-the-workshop', 'a-very-long-title']) {
        await page.goto(`${base}/blog/${slug}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
        await shot(page, `${w}-entry-${slug}`);
        report.states[`${w}-entry-${slug}`] = await page.evaluate(() => ({
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          column: Math.round(document.querySelector('.post-article')?.getBoundingClientRect().width ?? 0),
        }));
      }
    }
    await page.context().close();
  }

  // Reduced motion.
  page = await open(viewport, { reducedMotion: 'reduce' });
  await enter(page);
  await shot(page, `${w}-reduced-motion-about`);
  await page.context().close();
}

// Keyboard only, desktop: enter with the keyboard, then record what each Tab
// press reaches, whether focus shows, and whether the focused control is on screen.
{
  const page = await open(widths[0]);
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2600);
  const stops = [];
  for (let press = 0; press < 40; press += 1) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(120);
    stops.push(await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        name: (element.getAttribute('aria-label') || element.textContent || element.tagName).trim().replace(/\s+/g, ' ').slice(0, 40),
        panel: element.closest('[data-panel]')?.getAttribute('data-panel') ?? null,
        ring: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0,
        onScreen: rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth,
      };
    }));
    if (press === 3) await shot(page, 'desktop-keyboard-focus');
  }
  report.states['desktop-keyboard'] = { stops };
  await page.context().close();
}

// 200% zoom on a 1280 x 800 screen: a 640 x 400 CSS viewport at twice the density.
{
  const page = await open({ width: 640, height: 400 }, { deviceScaleFactor: 2 });
  await enter(page);
  await shot(page, 'zoom200-about');
  report.states['zoom200-about'] = {
    ...(await layout(page, 'about')),
    nav: await page.locator('#cnav').evaluate((nav) => {
      const rect = nav.getBoundingClientRect();
      return { top: Math.round(rect.top), bottom: Math.round(rect.bottom), fits: rect.bottom <= innerHeight && rect.top >= 0 };
    }),
  };
  await show(page, 2);
  await shot(page, 'zoom200-projects');
  report.states['zoom200-projects'] = await layout(page, 'projects');
  await page.context().close();
}

await browser.close();
await writeFile(`${out}/measurements.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${Object.keys(report.states).length} states to ${out}`);
