import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const siteUrl = new URL('mockups/koreokorp-v2/index.html', root);
const requiredFiles = [
  'mockups/koreokorp-v2/index.html',
  'mockups/koreokorp-v2/README.md',
  'assets/koreokorp-logo-original.webp',
  'assets/koreokorp-logo-cutout.webp',
  'assets/koreokorp-logo-outline.json',
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

if (failures.length) {
  console.error('Repository checks failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Repository checks passed (${requiredFiles.length} files, ${panels.length} panels, ${ids.length} unique ids).`);
