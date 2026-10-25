import { pageFields } from './content-model.js';

function element(tag, text, className) {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  if (className) result.className = className;
  return result;
}
function image(item) {
  const img = element('img');
  img.src = item.image;
  img.alt = item.imageAlt;
  img.loading = 'lazy';
  img.className = 'content-image';
  return img;
}
const formatDate = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

async function renderContent() {
  const response = await fetch('/api/content');
  if (!response.ok) throw new Error('Content unavailable');
  const content = await response.json();
  for (const [, key, , selector] of pageFields) {
    const target = document.querySelector(selector);
    if (target && typeof content.pages[key] === 'string') target.textContent = content.pages[key];
  }
  const posts = [...content.posts].sort((a, b) => b.date.localeCompare(a.date));
  const latest = document.querySelector('.latest');
  latest.replaceChildren();
  if (posts.length) latest.append(element('small', 'Latest post'), element('strong', posts[0].title), element('span', formatDate(posts[0].date)));
  else latest.append(element('span', 'No entries yet. Check back soon.'));
  const list = document.querySelector('.post-list');
  list.replaceChildren();
  for (const post of posts) {
    const row = element('li');
    const time = element('time', formatDate(post.date));
    time.dateTime = post.date;
    const details = element('details', undefined, 'published-post');
    const summary = element('summary');
    summary.append(element('strong', post.title), element('p', post.excerpt || 'Read entry'));
    details.append(summary);
    if (post.image) details.append(image(post));
    const body = element('div', undefined, 'post-body');
    for (const paragraph of post.body.split(/\n\s*\n/)) body.append(element('p', paragraph));
    details.append(body);
    row.append(time, details);
    list.append(row);
  }
  document.querySelector('.admin-note').textContent = posts.length ? 'Select an entry to read it.' : 'The journal is waiting for its first entry.';
  const projects = document.querySelector('.proj');
  projects.replaceChildren();
  for (const project of content.projects) {
    const card = element('article', undefined, 'published-project');
    if (project.image) card.append(image(project));
    card.append(element('strong', project.title), element('span', project.description));
    if (project.url) {
      const link = element('a', 'View project');
      link.href = project.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      card.append(link);
    }
    projects.append(card);
  }
  if (!content.projects.length) projects.append(element('p', 'New projects are on the way.'));
}
if (location.protocol !== 'file:') renderContent().catch(() => {
  document.querySelector('.admin-note').textContent = 'Entries could not be loaded. Refresh the page to try again.';
});
