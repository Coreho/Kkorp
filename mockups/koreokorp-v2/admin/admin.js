import { emptyProject, pageFields, projectStages, slugify, slugPattern } from '../content-model.js';
import { parseMarkdown } from '../markdown.js';

const $ = (selector) => document.querySelector(selector);
let content;
let section = 'pages';
let selected = null;
let dirty = false;
let busy = false;
const login = $('#login');
const workspace = $('#workspace');
const editor = $('#editor');

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function message(text, error = false) {
  $('#message').textContent = text;
  $('#message').classList.toggle('error', error);
}
async function api(path, method = 'GET', data, headers = {}) {
  const response = await fetch(`/api/admin/${path}`, {
    method, headers: { 'Content-Type': 'application/json', 'X-KK-Admin': '1', ...headers },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== 'login' && content) {
      login.hidden = false;
      workspace.hidden = true;
      $('#login-message').textContent = 'Your session ended. Sign in again; your unsaved form is still here.';
      $('#password').focus();
    }
    throw new Error(result.error || 'Could not connect. Try again.');
  }
  return result;
}
function canLeave() {
  return !busy && (!dirty || confirm('Discard your unsaved changes?'));
}
function field(form, key, label, value = '', type = 'text', required = false, max = 4000) {
  const wrapper = node('div', undefined, 'field');
  const input = node(type === 'textarea' ? 'textarea' : 'input');
  input.id = `field-${key}`;
  input.name = key;
  input.value = value;
  input.maxLength = max;
  input.required = required;
  if (type !== 'textarea') input.type = type;
  const caption = node('label', label);
  caption.htmlFor = input.id;
  wrapper.append(caption, input);
  form.append(wrapper);
  return input;
}
function button(text, callback, className = '') {
  const element = node('button', text, className);
  element.type = 'button';
  element.addEventListener('click', callback);
  return element;
}
// The address a title gives, with -2, -3 when another entry has it, as assignSlugs does on the server.
function addressFor(title, taken) {
  const base = slugify(title);
  let slug = base;
  for (let suffix = 2; taken.has(slug); suffix += 1) slug = `${base}-${suffix}`;
  return slug;
}
function followsTitle(slug, title) {
  const base = slugify(title);
  return slug === base || (slug.startsWith(`${base}-`) && /^\d+$/.test(slug.slice(base.length + 1)));
}
// The same reader as the public entry page, built as DOM nodes so nothing in an entry runs.
function inlineNodes(items) {
  return items.map((item) => {
    if (item.type === 'text') return document.createTextNode(item.value);
    if (item.type === 'break') return node('br');
    if (item.type === 'code') return node('code', item.value);
    const element = node(item.type === 'link' ? 'a' : item.type);
    if (item.type === 'link') {
      element.href = item.href;
      // A new tab, so following a link never leaves an unsaved entry.
      element.target = '_blank';
      element.rel = 'noopener noreferrer';
    }
    element.append(...inlineNodes(item.children));
    return element;
  });
}
function blockNode(block) {
  if (block.type === 'code') {
    const pre = node('pre');
    pre.append(node('code', block.value));
    return pre;
  }
  if (block.type === 'rule') return node('hr');
  if (block.type === 'quote') {
    const quote = node('blockquote');
    quote.append(...block.children.map(blockNode));
    return quote;
  }
  if (block.type === 'list') {
    const list = node(block.ordered ? 'ol' : 'ul');
    if (block.ordered && block.start !== 1) list.start = block.start;
    for (const item of block.items) {
      const entry = node('li');
      entry.append(...inlineNodes(item));
      list.append(entry);
    }
    return list;
  }
  const element = node(block.type === 'heading' ? `h${block.level}` : 'p');
  element.append(...inlineNodes(block.children));
  return element;
}
function postDate(date) {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
function updateCounts() {
  $('#post-count').textContent = content.posts.length;
  $('#project-count').textContent = content.projects.length;
}
async function save(next, success) {
  busy = true;
  editor.querySelectorAll('button, input, textarea').forEach((element) => { element.disabled = true; });
  message('Saving…');
  try {
    content = await api('content', 'PUT', next, { 'If-Match': String(content.revision) });
    dirty = false;
    updateCounts();
    renderEditor();
    renderList();
    message(success);
  } catch (error) { message(error.message, true); }
  finally {
    busy = false;
    editor.querySelectorAll('button, input, textarea').forEach((element) => { element.disabled = false; });
  }
}
function renderPages() {
  const form = node('form');
  let group;
  let previous;
  for (const [name, key, label] of pageFields) {
    if (name !== previous) {
      group = node('fieldset', undefined, 'field-group');
      group.append(node('legend', name));
      form.append(group);
      previous = name;
    }
    field(group, key, label, content.pages[key], /Body|Intro/.test(key) ? 'textarea' : 'text');
  }
  const actions = node('div', undefined, 'actions');
  const submit = node('button', 'Save page text', 'primary');
  submit.type = 'submit';
  actions.append(submit, node('span', 'Updates the live website.', 'helper'));
  form.append(actions);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const next = structuredClone(content);
    next.pages = Object.fromEntries(new FormData(form));
    save(next, 'Page text saved. Your changes are live.');
  });
  editor.append(form);
}
function renderList() {
  if (section === 'pages') return;
  const list = $('#entry-list');
  list.replaceChildren();
  const entries = content[section].filter((item) => item.title.toLowerCase().includes($('#search').value.toLowerCase()));
  if (!entries.length) list.append(node('p', $('#search').value ? 'No matching entries.' : 'Nothing here yet. Add your first entry.'));
  for (const item of entries) {
    const row = button('', () => {
      if (!canLeave()) return;
      selected = item.id;
      dirty = false;
      message('');
      renderList();
      renderEditor();
    }, 'entry-row');
    row.append(node('strong', item.title), node('span', item.status === 'published' ? 'Published' : 'Draft · only visible here'));
    if (selected === item.id) row.setAttribute('aria-current', 'true');
    list.append(row);
  }
}
function addressField(form, item, title) {
  const published = item?.status === 'published';
  const taken = new Set(content.posts.filter((post) => post.id !== item?.id).map((post) => post.slug).filter(Boolean));
  const fromTitle = () => (title.value.trim() ? addressFor(title.value, taken) : '');
  // An unpublished entry's address follows its title until the owner types one; a published address stays put.
  let following = !published && (!item?.slug || followsTitle(item.slug, item.title));
  const input = field(form, 'slug', 'Web address', item?.slug || fromTitle(), 'text', true, 80);
  input.spellcheck = false;
  input.autocapitalize = 'off';
  // Entries saved before addresses were stored get theirs from the title, as the public site does.
  const original = input.value;
  const row = node('div', undefined, 'slug-row');
  input.replaceWith(row);
  row.append(node('span', '/blog/', 'slug-prefix'), input);
  const help = node('p', '', 'helper');
  help.id = 'slug-help';
  input.setAttribute('aria-describedby', help.id);
  row.after(help);
  const check = () => {
    const value = input.value;
    const problem = !value && following ? ''
      : !slugPattern.test(value) ? 'Use lowercase letters, numbers, and single hyphens, such as my-first-entry.'
        : taken.has(value) ? 'Another blog entry already uses this web address.' : '';
    input.setCustomValidity(problem);
    help.classList.toggle('error', Boolean(problem));
    help.textContent = problem || (following ? 'Follows the title until you change it.'
      : published && value !== original ? 'Changing a published address breaks links to the old one.'
        : 'Stays the same when the title changes.');
  };
  title.addEventListener('input', () => {
    if (following) input.value = fromTitle();
    check();
  });
  input.addEventListener('input', () => {
    following = false;
    check();
  });
  input.addEventListener('change', () => {
    // Typed text becomes an address: "My First Entry!" is saved as my-first-entry.
    if (input.value.trim()) input.value = slugify(input.value);
    else if (published) input.value = original;
    else {
      following = true;
      input.value = fromTitle();
    }
    check();
  });
  check();
}
function splitTechnologies(text) {
  return text.split(',').map((name) => name.trim()).filter(Boolean);
}
function technologiesField(form, names) {
  const input = field(form, 'technologies', 'Technologies (optional)', names.join(', '), 'text', false, 600);
  form.append(node('p', 'Separate with commas, such as Next.js, Canvas. Up to 12.', 'helper'));
  // The same rules as the server, reported on the field before anything is sent.
  input.addEventListener('input', () => {
    const list = splitTechnologies(input.value);
    const seen = new Set();
    const repeated = list.find((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    });
    input.setCustomValidity(list.length > 12 ? 'List at most 12 technologies.'
      : list.some((name) => name.length > 40) ? 'Keep each technology under 40 characters.'
        : repeated ? `${repeated} is listed twice.` : '');
  });
}
function stageField(form, stage) {
  const wrapper = node('div', undefined, 'field');
  const select = node('select');
  select.id = 'field-stage';
  select.name = 'stage';
  for (const [value, label] of [['', 'Not shown'], ...Object.entries(projectStages)]) {
    const option = node('option', label);
    option.value = value;
    option.selected = value === stage;
    select.append(option);
  }
  const caption = node('label', 'Stage');
  caption.htmlFor = select.id;
  wrapper.append(caption, select);
  form.append(wrapper);
}
function readAsBase64(file) {
  return new Promise((done, reject) => {
    const reader = new FileReader();
    reader.onload = () => done(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
// One image or video for an entry: upload a file, or reuse one uploaded earlier.
function mediaSlot(form, kind, label, value, onChange) {
  const video = kind === 'video';
  const limit = video ? 15 : 5;
  const slot = { value, preview: node(video ? 'video' : 'img', undefined, 'image-preview') };
  const input = field(form, `${kind}-file`, label, '', 'file');
  input.accept = video ? 'video/mp4,video/webm' : 'image/png,image/jpeg,image/webp,image/gif';
  form.append(node('p', video ? `MP4 or WebM, up to ${limit} MB. It plays muted, so keep it short.` : `PNG, JPEG, WebP, or GIF. Maximum ${limit} MB.`, 'helper'));
  if (video) Object.assign(slot.preview, { muted: true, controls: true, playsInline: true, preload: 'metadata' });
  else slot.preview.alt = 'Selected image';
  const remove = button(video ? 'Remove video' : 'Remove image', () => use(''), 'remove-image');
  const picker = node('details', undefined, 'media-picker');
  const choices = node('div', undefined, 'picker-grid');
  picker.append(node('summary', video ? 'Use an earlier video' : 'Use an earlier image'), choices);
  form.append(slot.preview, remove, picker);
  function use(url, changed = true) {
    slot.value = url;
    slot.preview.hidden = !url;
    remove.hidden = !url;
    if (url) slot.preview.src = url;
    else slot.preview.removeAttribute('src');
    if (changed) {
      dirty = true;
      onChange();
    }
  }
  use(value, false);
  picker.addEventListener('toggle', async () => {
    if (!picker.open) return;
    choices.replaceChildren(node('p', 'Loading uploads…', 'helper'));
    try {
      const uploads = (await api('uploads')).uploads.filter((upload) => upload.kind === kind);
      if (!uploads.length) {
        choices.replaceChildren(node('p', `No earlier ${kind}s yet.`, 'helper'));
        return;
      }
      choices.replaceChildren(...uploads.map((upload) => {
        const date = new Date(upload.modified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const choice = button('', () => {
          use(upload.url);
          picker.open = false;
          message(`Earlier ${kind} chosen. Save your entry to keep it.`);
        }, 'picker-choice');
        choice.setAttribute('aria-label', `Use the ${kind} uploaded ${date}, ${Math.max(1, Math.round(upload.size / 1024))} KB`);
        const thumb = node(video ? 'video' : 'img');
        thumb.src = upload.url;
        if (video) thumb.muted = true;
        else thumb.alt = '';
        choice.append(thumb, node('span', date));
        return choice;
      }));
    } catch (error) { choices.replaceChildren(node('p', error.message, 'helper error')); }
  });
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > limit * 1024 * 1024) {
      message(`Use ${video ? 'a video' : 'an image'} under ${limit} MB.`, true);
      input.value = '';
      return;
    }
    busy = true;
    form.querySelectorAll('button').forEach((element) => { element.disabled = true; });
    message(video ? 'Uploading video…' : 'Uploading image…');
    try {
      use((await api('uploads', 'POST', { data: await readAsBase64(file) })).url);
      message(`${video ? 'Video' : 'Image'} uploaded. Describe it, or mark it decorative, then save your entry.`);
    } catch (error) { message(error.message, true); }
    finally {
      busy = false;
      input.value = '';
      form.querySelectorAll('button').forEach((element) => { element.disabled = false; });
    }
  });
  return slot;
}
// Projects appear on the website in this order.
function orderRow(item) {
  const index = content.projects.findIndex((project) => project.id === item.id);
  const row = node('div', undefined, 'order-row');
  const move = (offset) => {
    if (busy) return;
    if (dirty) {
      message('Save or discard your changes before moving the project.', true);
      return;
    }
    const next = structuredClone(content);
    const [moved] = next.projects.splice(index, 1);
    next.projects.splice(index + offset, 0, moved);
    save(next, 'Order saved. The website shows projects in this order.');
  };
  const earlier = button('Move earlier', () => move(-1));
  const later = button('Move later', () => move(1));
  earlier.disabled = index === 0;
  later.disabled = index === content.projects.length - 1;
  row.append(node('span', `Position ${index + 1} of ${content.projects.length} on the website`, 'helper'), earlier, later);
  return row;
}
function renderEntry() {
  const item = content[section].find((entry) => entry.id === selected);
  if (!item && selected !== 'new') {
    const empty = node('div', undefined, 'empty');
    empty.append(node('h2', section === 'posts' ? 'Your next entry starts here.' : 'Give your work a home.'), node('p', 'Add an entry, or choose one from the list to edit.'));
    editor.append(empty);
    return;
  }
  const post = section === 'posts';
  const entry = item ? { ...(post ? {} : emptyProject), ...item } : post ? { title: '', excerpt: '', body: '', date: new Date().toISOString().slice(0, 10), image: '', imageAlt: '', status: 'draft' } : { ...emptyProject };
  const form = node('form');
  const heading = node('div', undefined, 'entry-heading');
  heading.append(node('h2', item ? 'Edit entry' : post ? 'New blog entry' : 'New project'), node('span', entry.status === 'published' ? 'Published' : 'Draft', 'entry-status'));
  form.append(heading);
  const title = field(form, 'title', 'Title', entry.title, 'text', true, 200);
  if (post) {
    addressField(form, item, title);
    field(form, 'date', 'Publication date', entry.date, 'date', true, 10);
    field(form, 'excerpt', 'Short introduction', entry.excerpt, 'textarea', false, 1000);
    const body = field(form, 'body', 'Post text', entry.body, 'textarea', true, 100000);
    body.className = 'body-input';
    form.append(node('p', 'Blank lines separate paragraphs. Markdown works for headings, **bold**, *italic*, links, lists, quotes, and code. The date labels your entry; publishing makes it live immediately.', 'helper'));
  } else {
    field(form, 'description', 'Project description', entry.description, 'textarea', true, 10000);
    technologiesField(form, entry.technologies);
    stageField(form, entry.stage);
    field(form, 'url', 'Project link (optional)', entry.url, 'url', false, 2000);
    field(form, 'sourceUrl', 'Source code link (optional)', entry.sourceUrl, 'url', false, 2000);
  }
  // A missing description is reported on its field, and cleared by anything that could resolve it.
  const resolved = () => alt.setCustomValidity('');
  const image = mediaSlot(form, 'image', post ? 'Cover image (optional)' : 'Project image (optional)', entry.image, resolved);
  const video = post ? null : mediaSlot(form, 'video', 'Preview video (optional)', entry.video, resolved);
  const alt = field(form, 'imageAlt', post ? 'Image description' : 'Media description', entry.imageAlt, 'text', false, 300);
  alt.addEventListener('input', () => {
    image.preview.alt = alt.value;
    resolved();
  });
  let decorative;
  if (!post) {
    form.append(node('p', 'Describes the image and video for people using screen readers.', 'helper'));
    const row = node('label', undefined, 'check');
    decorative = node('input');
    decorative.type = 'checkbox';
    decorative.name = 'mediaDecorative';
    decorative.checked = entry.mediaDecorative;
    decorative.addEventListener('change', resolved);
    row.append(decorative, node('span', 'Decorative: the media adds nothing the title and description do not already say'));
    form.append(row);
  }
  const details = node('details', undefined, 'entry-preview');
  const previewContent = node('div', undefined, post ? 'preview-article' : 'preview-content');
  details.append(node('summary', 'Preview'), previewContent);
  const renderPreview = () => {
    if (!details.open) return;
    const values = form.elements;
    if (!post) {
      const parts = [node('h2', values.title.value)];
      if (projectStages[values.stage.value]) parts.push(node('p', projectStages[values.stage.value], 'preview-date'));
      parts.push(node('p', values.description.value));
      const names = splitTechnologies(values.technologies.value);
      if (names.length) parts.push(node('p', names.join(' · '), 'preview-date'));
      previewContent.replaceChildren(...parts);
      return;
    }
    const parts = [node('h2', values.title.value || 'Untitled entry', 'preview-title')];
    if (postDate(values.date.value)) parts.push(node('p', postDate(values.date.value), 'preview-date'));
    if (values.excerpt.value.trim()) parts.push(node('p', values.excerpt.value, 'preview-standfirst'));
    previewContent.replaceChildren(...parts, ...parseMarkdown(values.body.value).map(blockNode));
  };
  details.addEventListener('toggle', renderPreview);
  form.addEventListener('input', renderPreview);
  form.append(details);
  const actions = node('div', undefined, 'actions');
  const draft = node('button', item?.status === 'published' ? 'Unpublish to draft' : 'Save draft');
  draft.type = 'submit';
  draft.name = 'draft';
  const publish = node('button', item?.status === 'published' ? 'Save published entry' : 'Publish entry', 'primary');
  publish.type = 'submit';
  publish.name = 'publish';
  actions.append(draft, publish);
  if (item && !post) form.append(orderRow(item));
  if (item) actions.append(button('Delete entry', () => {
    if (busy || !confirm(`Delete “${item.title}”? This removes it from the website too.`)) return;
    const next = structuredClone(content);
    next[section] = next[section].filter((value) => value.id !== item.id);
    save(next, 'Entry deleted.');
  }, 'danger'));
  form.append(actions);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (busy) return;
    if ((image.value || video?.value) && !alt.value.trim() && !decorative?.checked) {
      alt.setCustomValidity(post ? 'Describe the image for visitors using screen readers.' : 'Describe the image or video, or mark it decorative.');
      alt.reportValidity();
      return;
    }
    const status = event.submitter?.name === 'publish' ? 'published' : 'draft';
    const next = structuredClone(content);
    const id = item?.id || crypto.randomUUID();
    const values = Object.fromEntries(new FormData(form));
    delete values['image-file'];
    delete values['video-file'];
    const value = { ...values, id, status, image: image.value };
    if (!post) Object.assign(value, { technologies: splitTechnologies(values.technologies), video: video.value, mediaDecorative: decorative.checked });
    const index = next[section].findIndex((value) => value.id === id);
    if (index < 0) next[section].unshift(value);
    else next[section][index] = value;
    selected = id;
    save(next, status === 'published' ? 'Entry published. It is live on the website.' : 'Draft saved. Only visible in the editor.');
  });
  editor.append(form);
}
function renderEditor() {
  editor.replaceChildren();
  if (section === 'pages') renderPages();
  else renderEntry();
  editor.querySelector('form')?.addEventListener('input', () => { dirty = true; });
}
function navigate(next) {
  if (!canLeave()) return;
  section = next;
  selected = null;
  dirty = false;
  $('#search').value = '';
  $('#collection').hidden = section === 'pages';
  const names = { pages: 'Page text', posts: 'Blog entries', projects: 'Projects' };
  $('#section-title').textContent = names[section];
  $('#section-description').textContent = section === 'pages' ? 'Make it sound like you. Saved changes appear on the website.' : section === 'posts' ? 'Write something worth sharing. Keep a draft until you’re ready.' : 'Add the things you’re making, and the stories behind them.';
  $('#add-entry').textContent = section === 'posts' ? 'Add blog entry' : 'Add project';
  document.querySelectorAll('[data-section]').forEach((element) => {
    if (element.dataset.section === section) element.setAttribute('aria-current', 'page');
    else element.removeAttribute('aria-current');
  });
  message('');
  renderList();
  renderEditor();
}
async function openWorkspace() {
  if (!content) {
    content = await api('content');
    updateCounts();
    renderEditor();
  }
  login.hidden = true;
  workspace.hidden = false;
  $('#main').focus();
}
$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  $('#login-message').textContent = 'Signing in…';
  try {
    await api('login', 'POST', { password: $('#password').value });
    $('#password').value = '';
    $('#login-message').textContent = '';
    await openWorkspace();
  } catch (error) { $('#login-message').textContent = error.message; }
  finally { submit.disabled = false; }
});
$('#show-password').addEventListener('click', (event) => {
  const show = $('#password').type === 'password';
  $('#password').type = show ? 'text' : 'password';
  event.currentTarget.textContent = show ? 'Hide' : 'Show';
  event.currentTarget.setAttribute('aria-pressed', String(show));
});
document.querySelectorAll('[data-section]').forEach((element) => element.addEventListener('click', () => navigate(element.dataset.section)));
$('#search').addEventListener('input', renderList);
$('#add-entry').addEventListener('click', () => {
  if (!canLeave()) return;
  selected = 'new';
  dirty = false;
  message('');
  renderList();
  renderEditor();
  $('#field-title').focus();
});
$('#logout').addEventListener('click', async () => {
  if (!canLeave()) return;
  try {
    await api('logout', 'POST', {});
    content = null;
    dirty = false;
    editor.replaceChildren();
    workspace.hidden = true;
    login.hidden = false;
    $('#password').focus();
  } catch (error) { message(error.message, true); }
});
window.addEventListener('beforeunload', (event) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
$('#transport-note').textContent = location.protocol === 'https:' ? 'Encrypted connection · password-protected access' : 'Local preview · HTTPS is required when hosted';
if (['127.0.0.1', 'localhost'].includes(location.hostname)) $('#view-site').href = '/';
openWorkspace().catch((error) => { if (!error.message.includes('Sign in')) $('#login-message').textContent = error.message; });
