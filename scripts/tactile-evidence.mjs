/**
 * Capture TASK-015 evidence: screenshots at 1280px and 390px, plus the
 * performance numbers AC#8 asks for.
 *
 * Run once before any change and once after, with a label argument.
 *
 *   node scripts/tactile-evidence.mjs before
 *   node scripts/tactile-evidence.mjs after
 */

import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const label = process.argv[2] ?? 'snap';
const base = process.env.TACTILE_BASE ?? 'http://127.0.0.1:4180';
const outDir = `docs/evidence/tactile-${label}`;

const WIDTHS = [
  { name: '1280px', width: 1280, height: 800 },
  { name: '390px', width: 390, height: 844 },
];

/** Settle the site: enter, then land on a panel with its scene painted. */
async function settle(page) {
  await page.waitForTimeout(1200);
  await page.locator('#enter').click({ force: true });
  await page.waitForTimeout(2600);
}

const report = { label, base, captured: new Date().toISOString(), widths: {} };

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();

for (const vp of WIDTHS) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });

  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));

  // Long tasks must be observed from the first script, so arm the observer via
  // addInitScript before any navigation.
  await page.addInitScript(() => {
    window.__long = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.__long.push(Math.round(e.duration));
        }
      }).observe({ entryTypes: ['longtask'] });
    } catch {
      /* longtask unsupported: reported as null rather than guessed */
    }
  });

  const res = await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${outDir}/${vp.name}-landing.png` });

  await settle(page);

  const panels = {};
  for (const [index, id] of ['about', 'blog', 'projects', 'chat'].entries()) {
    await page.locator(`#cnav button[data-i="${index}"]`).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${outDir}/${vp.name}-${id}.png` });
    panels[id] = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      viewport: window.innerWidth,
    }));
  }

  // Hover the middle nav item with a real pointer so magnetism and pill travel
  // are captured in their engaged state, not at rest.
  const navBox = await page.locator('#cnav button[data-i="2"]').boundingBox();
  if (navBox) {
    await page.mouse.move(navBox.x + navBox.width / 2, navBox.y + navBox.height / 2);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${outDir}/${vp.name}-nav-hover.png` });
  }

  // Hover inside the About panel so panel tilt is captured in its engaged state.
  await page.locator('#cnav button[data-i="0"]').click();
  await page.waitForTimeout(1200);
  const panelBox = await page.locator('[data-panel="about"]').boundingBox();
  if (panelBox) {
    await page.mouse.move(panelBox.x + panelBox.width * 0.72, panelBox.y + panelBox.height * 0.3);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${outDir}/${vp.name}-panel-tilt.png` });
  }

  const perf = await page.evaluate(() => {
    const long = window.__long ?? [];
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource')
      .filter((r) => r.name.endsWith('.js'));
    return {
      longestTaskMs: long.length ? Math.max(...long) : null,
      longTaskCount: long.length,
      domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      jsTransferredKB: +(res.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024).toFixed(1),
      jsDecodedKB: +(res.reduce((s, r) => s + (r.decodedBodySize || 0), 0) / 1024).toFixed(1),
      jsRequestCount: res.length,
    };
  });

  report.widths[vp.name] = {
    status: res.status(),
    panels,
    perf,
    consoleErrors: errors.length,
    firstError: errors[0] ?? null,
  };
  await page.close();
}

await browser.close();

const { mkdir: mk, writeFile } = await import('node:fs/promises');
await writeFile(`${outDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
