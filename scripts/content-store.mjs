import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { assignSlugs, emptyProject, initialContent, pageFields, projectStages, slugPattern } from '../mockups/koreokorp-v2/content-model.js';

export const contentDirectory = resolve(process.env.CONTENT_DIR || 'data');
const contentPath = resolve(contentDirectory, 'content.json');
let queue = Promise.resolve();
export const fail = (status, message) => Object.assign(new Error(message), { status });

export async function loadContent() {
  try { return JSON.parse(await readFile(contentPath, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return initialContent(); throw error; }
}

function link(value, name) {
  const text = string(value ?? '', 2000, name);
  if (!text) return '';
  let url;
  try { url = new URL(text); } catch { throw fail(400, `Use a complete https:// address for the ${name}.`); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw fail(400, `Use an HTTP or HTTPS ${name} without credentials.`);
  return text;
}

function technologies(value = []) {
  if (!Array.isArray(value) || value.length > 12) throw fail(400, 'List at most 12 technologies.');
  const seen = new Set();
  return value.map((item) => {
    const name = string(item, 40, 'technology', true);
    if (seen.has(name.toLowerCase())) throw fail(400, `${name} is listed twice.`);
    seen.add(name.toLowerCase());
    return name;
  });
}

function string(value, max, name, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw fail(400, `Check ${name} (maximum ${max} characters).`);
  return value.trim();
}

export function validateContent(input) {
  if (!input || !input.pages) throw fail(400, 'Page text is missing.');
  const pages = Object.fromEntries(pageFields.map(([, key, label]) => [key, string(input.pages[key], 4000, label)]));
  const collections = {};
  for (const kind of ['posts', 'projects']) {
    if (!Array.isArray(input[kind]) || input[kind].length > 500) throw fail(400, 'Use at most 500 entries per collection.');
    const ids = new Set();
    const slugs = new Set();
    collections[kind] = input[kind].map((item) => {
      if (!item || !/^[a-zA-Z0-9-]{1,80}$/.test(item.id) || ids.has(item.id)) throw fail(400, 'Entry IDs must be unique.');
      ids.add(item.id);
      if (!['draft', 'published'].includes(item.status)) throw fail(400, 'Choose draft or published.');
      const entry = { id: item.id, title: string(item.title, 200, 'title', true), status: item.status };
      entry.image = string(item.image, 200, 'image');
      if (entry.image && !/^\/uploads\/[a-f0-9-]+\.(png|jpg|webp|gif)$/.test(entry.image)) throw fail(400, 'Upload an image using the editor.');
      entry.imageAlt = string(item.imageAlt, 300, 'image description');
      if (kind === 'posts') {
        entry.excerpt = string(item.excerpt, 1000, 'excerpt');
        entry.body = string(item.body, 100000, 'post body', true);
        entry.date = string(item.date, 10, 'date', true);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || !Number.isFinite(Date.parse(entry.date)) || new Date(entry.date).toISOString().slice(0, 10) !== entry.date) throw fail(400, 'Enter a valid date.');
        if (item.slug !== undefined && item.slug !== '') {
          entry.slug = string(item.slug, 80, 'web address');
          if (!slugPattern.test(entry.slug)) throw fail(400, 'Use lowercase letters, numbers, and hyphens in the web address.');
          if (slugs.has(entry.slug)) throw fail(400, 'Two blog entries use the same web address.');
          slugs.add(entry.slug);
        }
        if (entry.image && !entry.imageAlt) throw fail(400, 'Describe the image for visitors using screen readers.');
      } else {
        const project = { ...emptyProject, ...item };
        entry.description = string(project.description, 10000, 'description', true);
        entry.technologies = technologies(project.technologies);
        if (project.stage !== '' && !Object.hasOwn(projectStages, project.stage)) throw fail(400, 'Choose a listed project stage.');
        entry.stage = project.stage;
        entry.url = link(project.url, 'project link');
        entry.sourceUrl = link(project.sourceUrl, 'source link');
        entry.video = string(project.video, 200, 'video');
        if (entry.video && !/^\/uploads\/[a-f0-9-]+\.(mp4|webm)$/.test(entry.video)) throw fail(400, 'Upload a video using the editor.');
        if (typeof project.mediaDecorative !== 'boolean') throw fail(400, 'Choose whether the media is decorative.');
        entry.mediaDecorative = project.mediaDecorative;
        if ((entry.image || entry.video) && !entry.imageAlt && !entry.mediaDecorative) throw fail(400, 'Describe the image or video for visitors using screen readers, or mark it decorative.');
      }
      return entry;
    });
  }
  collections.posts = assignSlugs(collections.posts);
  return { pages, ...collections };
}

export function saveContent(input, revision) {
  const operation = queue.then(async () => {
    const previous = await loadContent();
    if (String(previous.revision) !== revision) throw fail(409, 'Someone saved a newer version. Reload the editor before saving again. Copy your changes first.');
    const next = { ...validateContent(input), revision: previous.revision + 1 };
    await mkdir(contentDirectory, { recursive: true, mode: 0o700 });
    const temporary = `${contentPath}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(next, null, 2), { mode: 0o600 });
    await rename(temporary, contentPath);
    return next;
  });
  queue = operation.catch(() => {});
  return operation;
}
