import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const siteUrl = new URL('mockups/koreokorp-v2/index.html', root);

// The prototype stays required: it is the production rollback target, so its
// invariants must keep holding even after the application replaces it.
const requiredFiles = [
  'mockups/koreokorp-v2/index.html',
  'mockups/koreokorp-v2/README.md',
  'assets/koreokorp-logo-original.webp',
  'assets/koreokorp-logo-cutout.webp',
  'assets/koreokorp-logo-outline.json',
  // The application itself.
  'app/page.tsx',
  'app/layout.tsx',
  'app/globals.css',
  'components/Site.tsx',
  'lib/store.ts',
  'next.config.ts',
];

/**
 * Selectors the browser tests pin, checked against the application source.
 *
 * These are not shape assertions about JSX, which would be brittle and prove
 * little. They are the contract the Playwright suite depends on: if a rename
 * drops one of these strings, the suite breaks, and this check says so before
 * a test run does.
 */
const appContracts = [
  'id="landing"',
  'id="enter"',
  'id="panels"',
  'id="cnav"',
  'id="signon"',
  'id="composer"',
  'id="saver"',
  'id="log"',
  'id="whoami"',
  'id="buddies"',
  'id="snErr"',
  'aria-label="Enter KoreoKorp"',
  'aria-label="Sections"',
  'aria-label="Message"',
  // The screen name is associated with a real <label>, which is stronger than
  // the aria-label some fields still use. Check the association for this one.
  'htmlFor="sn"',
  'data-panel',
  'data-i=',
  'data-now',
  "'kk_sn'",
];

/**
 * Dependencies the architecture decision rules out.
 *
 * docs/production-architecture.md commits to hand-written canvas engines and a
 * plain stylesheet. These libraries are the ones a rewrite of TASK-015 was
 * measured against and found incompatible with a viewport-fitted layout with no
 * scrollbar, so adding one silently should fail loudly.
 */
const bannedDependencies = [
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  'gsap',
  'framer-motion',
  'lenis',
];

/** Custom properties the prototype's stylesheet defines and the port must keep. */
const requiredCustomProperties = [
  '--ink',
  '--ink-2',
  '--muted',
  '--rule',
  '--card',
  '--glass-line',
  '--primary',
  '--tertiary',
  '--cyan',
  '--font',
  '--retro',
  '--ease',
  '--live',
];
const failures = [];

for (const path of requiredFiles) {
  try {
    await access(new URL(path, root));
  } catch {
    failures.push(`Missing required file: ${path}`);
  }
}

const html = await readFile(siteUrl, 'utf8');
const expectedPanels = ['about', 'blog', 'projects', 'chat'];
const panels = [...html.matchAll(/<section\s+class="panel\s+[^\"]*"\s+data-panel="([^"]+)"/g)]
  .map((match) => match[1]);

if (!/^<!doctype html>/i.test(html.trimStart())) failures.push('index.html must begin with an HTML doctype.');
if (html.includes('http://localhost')) failures.push('index.html contains a hard-coded localhost URL.');
if (panels.join(',') !== expectedPanels.join(',')) {
  failures.push(`Expected panels ${expectedPanels.join(', ')}, found ${panels.join(', ') || 'none'}.`);
}

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) failures.push(`Duplicate HTML ids: ${duplicateIds.join(', ')}`);

for (const id of ['landing', 'enter', 'panels', 'cnav', 'signon', 'composer', 'saver']) {
  if (!ids.includes(id)) failures.push(`Missing required element id: ${id}`);
}

if ((html.match(/<script>/g) || []).length !== (html.match(/<\/script>/g) || []).length) {
  failures.push('Script tags are unbalanced.');
}

// ---------- Application ----------

const appSources = [
  'app/page.tsx',
  'app/layout.tsx',
  'components/Site.tsx',
  'components/Chrome.tsx',
  'components/ChatWindow.tsx',
  'components/Panels.tsx',
  'components/Panel.tsx',
  'components/CanvasEngines.tsx',
  'lib/store.ts',
  'lib/useChatRoom.ts',
].map((path) => new URL(path, root));

const appSourceText = await Promise.all(
  appSources.map(async (url) => readFile(url, 'utf8')),
);
const appJoined = appSourceText.join('\n');

if (appJoined.includes('http://localhost')) {
  failures.push('Application source contains a hard-coded localhost URL.');
}
for (const contract of appContracts) {
  if (!appJoined.includes(contract)) {
    failures.push(`Application no longer contains the pinned contract: ${contract}`);
  }
}

const globalsCss = await readFile(new URL('app/globals.css', root), 'utf8');
for (const property of requiredCustomProperties) {
  if (!globalsCss.includes(`${property}:`)) {
    failures.push(`globals.css no longer defines ${property}`);
  }
}

const packageJson = JSON.parse(
  await readFile(new URL('package.json', root), 'utf8'),
);
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};
for (const banned of bannedDependencies) {
  if (dependencies[banned]) {
    failures.push(
      `Dependency "${banned}" conflicts with docs/production-architecture.md and must not be added.`,
    );
  }
}
for (const required of ['next', 'react', 'react-dom', 'typescript']) {
  if (!dependencies[required]) {
    failures.push(`Missing required dependency: ${required}`);
  }
}

if (failures.length) {
  console.error('Repository checks failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Repository checks passed (${requiredFiles.length} files, ${panels.length} panels, ` +
    `${ids.length} unique ids, ${appContracts.length} app contracts, ` +
    `${requiredCustomProperties.length} custom properties, ` +
    `${Object.keys(dependencies).length} dependencies).`,
);
