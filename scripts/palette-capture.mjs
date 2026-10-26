/**
 * Render TASK-007's palette proposals on the real site and measure them.
 *
 *   node scripts/palette-capture.mjs                        # https://koreokorp.com
 *   PALETTE_BASE=http://127.0.0.1:4180 node scripts/palette-capture.mjs
 *
 * Each palette in docs/design/palettes.json is injected as a stylesheet of
 * token overrides, then the landing, the open About panel and the Lobby are
 * captured. Writes JPEGs and contrast.json to docs/evidence/palettes/. Nothing
 * is changed on the site itself.
 */

import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { contrastRatio, decodePng, regionContrast } from '../tests/app/png.js';

const base = process.env.PALETTE_BASE ?? 'https://koreokorp.com';
const out = 'docs/evidence/palettes';
const { palettes } = JSON.parse(await readFile('docs/design/palettes.json', 'utf8'));

const channels = (hex) => hex.match(/[0-9a-f]{2}/gi).map((pair) => parseInt(pair, 16));
const rgb = (hex) => channels(hex).join(', ');
const colour = (hex) => {
  const [r, g, b] = channels(hex);
  return { r, g, b };
};
const ratio = (a, b) => Number(contrastRatio(colour(a), colour(b)).toFixed(2));

/**
 * Token overrides for one palette. Dark palettes only need the tokens and the
 * few hard-coded accents; the light palette also has to undo hard-coded white
 * text and white glass, which is exactly the work TASK-008 would make permanent.
 */
function stylesheet({ scheme, tokens: t, panelAccents: [about, blog, projects, lobby] }) {
  const ink = scheme === 'light' ? '23, 20, 31' : '255, 255, 255';
  const dark = `
:root { color-scheme: ${scheme}; --night: ${t.page}; --card: ${t.surface}; --ink: ${t.text}; --ink-2: ${t.textSoft};
  --muted: ${t.muted}; --rule: rgba(${ink}, .16); --glass-line: rgba(${ink}, .14); --primary: ${t.primary};
  --tertiary: ${t.secondary}; --cyan: ${t.accent}; --live: ${t.success}; }
body { background: radial-gradient(circle at 12% 12%, rgba(${rgb(t.primary)}, .16), transparent 26%),
  radial-gradient(circle at 88% 82%, rgba(${rgb(t.secondary)}, .12), transparent 28%), var(--night); }
.panel, .p1 { --accent-rgb: ${rgb(about)}; } .p2 { --accent-rgb: ${rgb(blog)}; }
.p3 { --accent-rgb: ${rgb(projects)}; } .p4 { --accent-rgb: ${rgb(lobby)}; }
:focus-visible, .landing-hit:focus-visible, .home-hit:focus-visible { outline-color: ${t.focus}; }
.cnav-pill, .cnav button[aria-current="true"] { background: linear-gradient(135deg, ${t.primary}, ${t.secondary}); }
.cnav { background: rgba(${rgb(t.surface)}, .82); border-color: rgba(${ink}, .16); }
.cnav .cnav-arrow { border-color: rgba(${ink}, .15); }
.landing { background: radial-gradient(ellipse at 50% 42%, rgba(${rgb(t.primary)}, .3) 0%, rgba(${rgb(t.surface)}, .44) 36%, transparent 68%),
  linear-gradient(160deg, ${t.surface} 0%, ${t.page} 55%, ${t.surface} 100%); }
.landing::after { border-color: rgba(${rgb(t.primary)}, .22); }
.landing-kicker, .landing-meta { color: ${t.muted}; }
.landing-kicker::before, .landing-kicker::after { background: linear-gradient(90deg, transparent, ${t.accent}); }
.landing-tag { color: ${t.text}; }
.landing-hint { border-color: rgba(${rgb(t.secondary)}, .4); background: rgba(${rgb(t.surface)}, .6); color: ${t.textSoft}; }
.landing-hint::before { box-shadow: 0 0 12px rgba(${rgb(t.accent)}, .9); }
/* The review's R1 removes the sample badge; hidden here so it does not dominate every mockup. */
.sample-tag { display: none; }`;
  if (scheme !== 'light') return dark;
  return `${dark}
h2 { background: linear-gradient(110deg, var(--ink) 15%, var(--ink-2) 58%, rgba(var(--accent-rgb), .95));
  -webkit-background-clip: text; background-clip: text; }
.now b, .about h3, .tl b, .links code, .p4 { color: var(--ink); }
.cnav button { color: var(--ink-2); }
.cnav button:hover { background: rgba(${ink}, .06); color: var(--ink); }
.cnav button[aria-current="true"] { color: #fff; }
.tl li, .links li { background: rgba(${ink}, .03); }
.copy { color: var(--ink); border-color: rgba(${ink}, .3); }
.jump { background: var(--ink); color: ${t.surface}; }
.panel { background: linear-gradient(145deg, rgba(255, 255, 255, .7), transparent 34%), var(--card);
  box-shadow: 0 30px 70px -30px rgba(${ink}, .35), inset 0 1px 0 rgba(255, 255, 255, .8); }
.p1 .bg, .p2 .bg, .p3 .bg { background: none; }
/* The dot field draws light dots for a dark page; inverted here as a stand-in for theme-aware engine colours. */
#dotfield { filter: invert(1); opacity: .5; }`;
}

const report = { base, captured: new Date().toISOString(), palettes: {} };
await mkdir(out, { recursive: true });
const browser = await chromium.launch();

async function open(viewport, palette) {
  const page = await browser.newPage({ viewport });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: stylesheet(palette) });
  await page.waitForTimeout(1500);
  return page;
}

async function show(page, index) {
  // Any movement wakes the screensaver, which starts after 25 s without input.
  await page.mouse.move(6 + index, 6);
  await page.locator(`#cnav button[data-i="${index}"]`).click();
  await page.waitForTimeout(1600);
}

for (const palette of palettes) {
  const t = palette.tokens;
  const tokens = {
    'text on page': ratio(t.text, t.page),
    'text on surface': ratio(t.text, t.surface),
    'soft text on surface': ratio(t.textSoft, t.surface),
    'muted text on surface': ratio(t.muted, t.surface),
    'white on primary (active section)': ratio('#ffffff', t.primary),
    'white on secondary (pill end)': ratio('#ffffff', t.secondary),
    'accent on surface': ratio(t.accent, t.surface),
    'focus on surface': ratio(t.focus, t.surface),
    'focus on page': ratio(t.focus, t.page),
    'success on surface': ratio(t.success, t.surface),
    'warning on surface': ratio(t.warning, t.surface),
    'danger on surface': ratio(t.danger, t.surface),
  };
  palette.panelAccents.forEach((accent, index) => {
    tokens[`${['About', 'Blog', 'Projects', 'Lobby'][index]} accent on surface`] = ratio(accent, t.surface);
  });
  const rendered = {};
  for (const viewport of [{ name: 'desktop', width: 1280, height: 800 }, { name: 'phone', width: 390, height: 844 }]) {
    const page = await open(viewport, palette);
    await page.screenshot({ path: `${out}/${palette.id}-${viewport.name}-landing.jpg`, type: 'jpeg', quality: 72 });
    await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
    await page.waitForTimeout(2600);
    await show(page, 0);
    await page.screenshot({ path: `${out}/${palette.id}-${viewport.name}-about.jpg`, type: 'jpeg', quality: 72 });
    const png = decodePng(await page.screenshot({ type: 'png' }));
    for (const selector of ['[data-panel="about"] .long', '[data-panel="about"] .tl li', '[data-panel="about"] .links li']) {
      const box = await page.locator(selector).first().boundingBox();
      if (box) rendered[`${viewport.name} ${selector.split(' ').pop()}`] = Number(regionContrast(png, box).ratio.toFixed(2));
    }
    if (viewport.name === 'desktop') {
      await show(page, 3);
      await page.screenshot({ path: `${out}/${palette.id}-desktop-lobby.jpg`, type: 'jpeg', quality: 72 });
    }
    await page.close();
  }
  report.palettes[palette.id] = { name: palette.name, tokens, rendered };
}

await browser.close();
await writeFile(`${out}/contrast.json`, `${JSON.stringify(report, null, 2)}\n`);
for (const [id, { tokens, rendered }] of Object.entries(report.palettes)) {
  console.log(id, JSON.stringify(tokens), JSON.stringify(rendered));
}
