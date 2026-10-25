import { pageFields } from '../content-model.js';

const $ = (selector) => document.querySelector(selector);
let content;
let section = 'pages';
let selected = null;
let dirty = false;
let busy = false;
let currentImage = '';
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
function renderEntry() {
  const item = content[section].find((entry) => entry.id === selected);
  if (!item && selected !== 'new') {
    const empty = node('div', undefined, 'empty');
    empty.append(node('h2', section === 'posts' ? 'Your next entry starts here.' : 'Give your work a home.'), node('p', 'Add an entry, or choose one from the list to edit.'));
    editor.append(empty);
    return;
  }
  const post = section === 'posts';
  const entry = item || { title: '', description: '', excerpt: '', body: '', date: new Date().toISOString().slice(0, 10), url: '', image: '', imageAlt: '', status: 'draft' };
  currentImage = entry.image;
  const form = node('form');
  const heading = node('div', undefined, 'entry-heading');
  heading.append(node('h2', item ? 'Edit entry' : post ? 'New blog entry' : 'New project'), node('span', entry.status === 'published' ? 'Published' : 'Draft', 'entry-status'));
  form.append(heading);
  field(form, 'title', 'Title', entry.title, 'text', true, 200);
  if (post) {
    field(form, 'date', 'Publication date', entry.date, 'date', true, 10);
    field(form, 'excerpt', 'Short introduction', entry.excerpt, 'textarea', false, 1000);
    const body = field(form, 'body', 'Post text', entry.body, 'textarea', true, 100000);
    body.className = 'body-input';
    form.append(node('p', 'Write in plain text. Blank lines separate paragraphs. The date labels your entry; publishing makes it live immediately.', 'helper'));
  } else {
    field(form, 'description', 'Project description', entry.description, 'textarea', true, 10000);
    field(form, 'url', 'Project link (optional)', entry.url, 'url', false, 2000);
  }
  const imageField = field(form, 'image-file', post ? 'Cover image (optional)' : 'Project image (optional)', '', 'file');
  imageField.accept = 'image/png,image/jpeg,image/webp,image/gif';
  form.append(node('p', 'PNG, JPEG, WebP, or GIF. Maximum 5 MB.', 'helper'));
  const preview = node('img', undefined, 'image-preview');
  preview.alt = entry.imageAlt || 'Selected image';
  preview.hidden = !entry.image;
  if (entry.image) preview.src = entry.image;
  form.append(preview);
  const removeImage = button('Remove image', () => {
    currentImage = '';
    preview.hidden = true;
    removeImage.hidden = true;
    imageField.value = '';
    dirty = true;
  }, 'remove-image');
  removeImage.hidden = !entry.image;
  form.append(removeImage);
  const alt = field(form, 'imageAlt', 'Image description', entry.imageAlt, 'text', false, 300);
  alt.addEventListener('input', () => { preview.alt = alt.value; });
  imageField.addEventListener('change', async () => {
    const file = imageField.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { message('Use an image under 5 MB.', true); imageField.value = ''; return; }
    busy = true;
    form.querySelectorAll('button').forEach((element) => { element.disabled = true; });
    message('Uploading image…');
    try {
      const encoded = await new Promise((done, reject) => {
        const reader = new FileReader();
        reader.onload = () => done(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await api('uploads', 'POST', { data: encoded });
      currentImage = result.url;
      preview.src = currentImage;
      preview.hidden = false;
      removeImage.hidden = false;
      dirty = true;
      message('Image uploaded. Add an image description, then save your entry.');
    } catch (error) { message(error.message, true); }
    finally { busy = false; imageField.value = ''; form.querySelectorAll('button').forEach((element) => { element.disabled = false; }); }
  });
  const details = node('details', undefined, 'entry-preview');
  const previewText = node('div', undefined, 'preview-content');
  details.append(node('summary', 'Preview text'), previewText);
  details.addEventListener('toggle', () => {
    if (!details.open) return;
    previewText.replaceChildren(node('h2', form.elements.title.value), node('p', post ? form.elements.body.value : form.elements.description.value));
  });
  form.append(details);
  const actions = node('div', undefined, 'actions');
  const draft = node('button', item?.status === 'published' ? 'Unpublish to draft' : 'Save draft');
  draft.type = 'submit';
  draft.name = 'draft';
  const publish = node('button', item?.status === 'published' ? 'Save published entry' : 'Publish entry', 'primary');
  publish.type = 'submit';
  publish.name = 'publish';
  actions.append(draft, publish);
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
    if (currentImage && !alt.value.trim()) { alt.required = true; alt.reportValidity(); return; }
    const status = event.submitter?.name === 'publish' ? 'published' : 'draft';
    const next = structuredClone(content);
    const id = item?.id || crypto.randomUUID();
    const values = Object.fromEntries(new FormData(form));
    delete values['image-file'];
    const value = { ...values, id, status, image: currentImage };
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
