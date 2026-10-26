import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashPassword } from '../scripts/admin-auth.mjs';

test.describe('content administration', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ baseURL: 'http://127.0.0.1:4182' });
  let server;
  let directory;
  const password = 'test-password-only-12345';
  async function startServer(port, nodeEnv = 'test', environment = {}) {
    const instance = spawn(process.execPath, ['scripts/serve.mjs', '--port', String(port)], {
      env: { ...process.env, NODE_ENV: nodeEnv, HOST: '127.0.0.1', ADMIN_ORIGIN: 'https://adctrl.koreokorp.com', PUBLIC_ORIGIN: 'https://koreokorp.com', CONTENT_DIR: directory, ADMIN_PASSWORD_HASH: undefined, ...environment },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise((resolve, reject) => {
      instance.once('error', reject);
      instance.once('exit', (code) => reject(new Error(`Server exited: ${code}`)));
      instance.stdout.on('data', (chunk) => { if (chunk.toString().includes('KoreoKorp preview:')) resolve(); });
    });
    return instance;
  }
  async function stopServer(instance) {
    if (instance && instance.exitCode === null) {
      const closed = new Promise((resolve) => instance.once('exit', resolve));
      instance.kill();
      await closed;
    }
  }
  test.beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'kkorp-admin-test-'));
    await writeFile(join(directory, 'admin-auth.json'), JSON.stringify({ hash: await hashPassword(password) }), { mode: 0o600 });
    server = await startServer(4182);
  });

  test.afterAll(async () => {
    await stopServer(server);
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  test('control health is private, sends no-store, and is independent of host and session', async ({ request }) => {
    const instance = await startServer(4183, 'production');
    try {
      for (const Host of ['127.0.0.1:4183', 'adctrl.koreokorp.com', 'unknown.example']) {
        const response = await request.get('http://127.0.0.1:4183/api/health', { headers: { Host } });
        expect(response.status()).toBe(200);
        expect(response.headers()['cache-control']).toBe('no-store');
        expect(await response.json()).toEqual({ ok: true, service: 'koreokorp-control' });
      }
      expect((await readdir(directory)).filter((name) => name.startsWith('.health-'))).toEqual([]);
      expect((await request.get('http://127.0.0.1:4183/api/content', { headers: { Host: 'unknown.example' } })).status()).toBe(421);
    } finally { await stopServer(instance); }
  });

  test('control health fails closed for missing storage and invalid content JSON', async ({ request }) => {
    const temporary = await mkdtemp(join(tmpdir(), 'kkorp-health-test-'));
    const instance = await startServer(4183, 'test', { CONTENT_DIR: temporary });
    try {
      await writeFile(join(temporary, 'content.json'), '{private invalid content');
      for (const state of ['invalid', 'missing']) {
        if (state === 'missing') await rm(temporary, { recursive: true });
        const response = await request.get('http://127.0.0.1:4183/api/health');
        expect(response.status()).toBe(503);
        expect(response.headers()['cache-control']).toBe('no-store');
        expect(await response.json()).toEqual({ ok: false, service: 'koreokorp-control' });
      }
    } finally {
      await stopServer(instance);
      await rm(temporary, { recursive: true, force: true });
    }
  });

  test('control exits nonzero after consecutive timed storage failures', async () => {
    const instance = await startServer(4183, 'test', {
      CONTENT_DIR: join(directory, 'missing'), HEALTH_CHECK_INTERVAL_MS: '100', HEALTH_CHECK_FAILURE_THRESHOLD: '3',
    });
    try {
      await expect.poll(() => instance.exitCode, { timeout: 5000 }).toBe(1);
    } finally { await stopServer(instance); }
  });

  test('control health shares concurrent requests and refreshes after the cache window', async ({ request }) => {
    const temporary = await mkdtemp(join(tmpdir(), 'kkorp-health-cache-'));
    const instance = await startServer(4183, 'test', { CONTENT_DIR: temporary, HEALTH_CACHE_MS: '1500' });
    const endpoint = 'http://127.0.0.1:4183/api/health';
    async function expectHealthyBurst() {
      const responses = await Promise.all(Array.from({ length: 20 }, () => request.get(endpoint)));
      for (const response of responses) {
        expect(response.status()).toBe(200);
        expect(response.headers()['cache-control']).toBe('no-store');
        expect(await response.json()).toEqual({ ok: true, service: 'koreokorp-control' });
      }
    }
    try {
      await expectHealthyBurst();
      await writeFile(join(temporary, 'content.json'), '{');
      await expectHealthyBurst();
      await expect.poll(async () => (await request.get(endpoint)).status(), { timeout: 5000 }).toBe(503);
      expect(await (await request.get(endpoint)).json()).toEqual({ ok: false, service: 'koreokorp-control' });
      expect((await readdir(temporary)).filter((name) => name.startsWith('.health-'))).toEqual([]);
    } finally {
      await stopServer(instance);
      await rm(temporary, { recursive: true, force: true });
    }
  });

  test('timed storage checks bypass a cached healthy HTTP result', async ({ request }) => {
    const temporary = await mkdtemp(join(tmpdir(), 'kkorp-health-fresh-'));
    const instance = await startServer(4183, 'test', {
      CONTENT_DIR: temporary, HEALTH_CACHE_MS: '60000',
      HEALTH_CHECK_INTERVAL_MS: '100', HEALTH_CHECK_FAILURE_THRESHOLD: '3',
    });
    try {
      expect((await request.get('http://127.0.0.1:4183/api/health')).status()).toBe(200);
      await writeFile(join(temporary, 'content.json'), '{');
      await expect.poll(() => instance.exitCode, { timeout: 5000 }).toBe(1);
    } finally {
      await stopServer(instance);
      await rm(temporary, { recursive: true, force: true });
    }
  });

  test('control stays running after a transient storage failure recovers', async () => {
    const temporary = await mkdtemp(join(tmpdir(), 'kkorp-health-recovery-'));
    await writeFile(join(temporary, 'content.json'), '{');
    const instance = await startServer(4183, 'test', {
      CONTENT_DIR: temporary, HEALTH_CHECK_INTERVAL_MS: '200', HEALTH_CHECK_FAILURE_THRESHOLD: '5',
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      await writeFile(join(temporary, 'content.json'), '{}');
      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(instance.exitCode).toBeNull();
      await writeFile(join(temporary, 'content.json'), '{');
      await expect.poll(() => instance.exitCode, { timeout: 5000 }).toBe(1);
    } finally {
      await stopServer(instance);
      await rm(temporary, { recursive: true, force: true });
    }
  });

  test('requires a login before accessing content administration', async ({ page, request }) => {
    expect((await request.get('/api/admin/content')).status()).toBe(401);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    await page.screenshot({ path: '.impeccable/review/login.png', fullPage: true });
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Page text' })).toBeVisible();
  });

  async function signIn(page) {
    await page.goto('/admin');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Page text' })).toBeVisible();
  }

  async function capture(page, name) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `.impeccable/review/${name}.png`, fullPage: true });
  }

  test('edits page copy, persists after reload, and renders text safely', async ({ page }) => {
    await signIn(page);
    await page.getByLabel('Tagline', { exact: true }).fill('A place for curious people.');
    await page.getByLabel('About text', { exact: true }).fill('Hello <script>alert("test")</script>');
    await page.getByRole('button', { name: 'Save page text' }).click();
    await expect(page.getByRole('status')).toContainText('Your changes are live');
    await page.reload();
    await expect(page.getByLabel('Tagline', { exact: true })).toHaveValue('A place for curious people.');
    await page.goto('/');
    await expect(page.locator('.landing-tag')).toHaveText('A place for curious people.');
    await expect(page.locator('.long')).toHaveText('Hello <script>alert("test")</script>');
    await expect(page.locator('.long script')).toHaveCount(0);
  });

  test('uploads a project image, saves privately, publishes, edits, and deletes a project', async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: /^Projects/ }).click();
    await page.getByRole('button', { name: 'Add project', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('A tiny radio');
    await page.getByLabel('Project description').fill('An internet radio experiment.');
    await page.getByLabel('Project link (optional)').fill('https://example.com/radio');
    await page.getByLabel('Project image (optional)').setInputFiles({
      name: 'radio.png', mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ3sAAAAASUVORK5CYII=', 'base64'),
    });
    await expect(page.getByRole('status')).toContainText('Image uploaded');
    await page.getByLabel('Image description').fill('Radio cover art');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Draft saved');
    let publicContent = await (await page.request.get('/api/content')).json();
    expect(publicContent.projects.some((item) => item.title === 'A tiny radio')).toBe(false);
    await page.getByRole('button', { name: 'Publish entry', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Entry published');
    publicContent = await (await page.request.get('/api/content')).json();
    const project = publicContent.projects.find((item) => item.title === 'A tiny radio');
    expect(project.image).toMatch(/^\/uploads\/.+\.png$/);
    expect((await page.request.get(project.image)).headers()['content-type']).toBe('image/png');
    await page.getByLabel('Title', { exact: true }).fill('A very tiny radio');
    await page.getByRole('button', { name: 'Save published entry' }).click();
    await expect(page.getByRole('status')).toContainText('Entry published');
    await page.goto('/');
    await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
    await page.locator('[data-i="2"]').click();
    await expect(page.getByText('A very tiny radio', { exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Radio cover art' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View project' })).toHaveAttribute('href', 'https://example.com/radio');
    await page.goto('/admin');
    await page.getByRole('button', { name: /^Projects/ }).click();
    await page.getByRole('button', { name: /A very tiny radio/ }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete entry' }).click();
    await expect(page.getByRole('status')).toContainText('Entry deleted');
    expect((await (await page.request.get('/api/content')).json()).projects.some((item) => item.id === project.id)).toBe(false);
  });

  test('publishes a readable blog entry and can unpublish it', async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: /^Blog entries/ }).click();
    await page.getByRole('button', { name: 'Add blog entry' }).click();
    await page.getByLabel('Title', { exact: true }).fill('A note from the workshop');
    await page.getByLabel('Short introduction', { exact: true }).fill('What I have been making.');
    await page.getByLabel('Post text').fill('First paragraph.\n\nSecond paragraph with <b>literal markup</b>.');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Draft saved');
    expect((await (await page.request.get('/api/content')).json()).posts).toHaveLength(0);
    await page.getByRole('button', { name: 'Publish entry', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Entry published');
    await page.goto('/');
    await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
    await page.locator('[data-i="1"]').click();
    await page.locator('.published-post summary').click();
    await expect(page.locator('.post-body')).toContainText('Second paragraph with <b>literal markup</b>.');
    await expect(page.locator('.post-body b')).toHaveCount(0);
    await page.goto('/admin');
    await page.getByRole('button', { name: /^Blog entries/ }).click();
    await page.getByRole('button', { name: /A note from the workshop/ }).click();
    await page.getByRole('button', { name: 'Unpublish to draft' }).click();
    await expect(page.getByRole('status')).toContainText('Draft saved');
    expect((await (await page.request.get('/api/content')).json()).posts).toHaveLength(0);
  });

  test('gives a published entry a web address that survives a new title', async ({ page }) => {
    const headers = { Origin: 'http://127.0.0.1:4182', 'X-KK-Admin': '1' };
    await signIn(page);
    await page.getByRole('button', { name: /^Blog entries/ }).click();
    await page.getByRole('button', { name: 'Add blog entry' }).click();
    await page.getByLabel('Title', { exact: true }).fill('Lasting address');
    await page.getByLabel('Post text').fill('An entry that keeps its address.');
    await page.getByRole('button', { name: 'Publish entry', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Entry published');
    const published = async () => (await (await page.request.get('/api/content')).json()).posts;
    expect((await published()).map((post) => post.slug)).toEqual(['lasting-address']);
    await expect(page.getByLabel('Web address')).toHaveValue('lasting-address');
    await expect(page.locator('#slug-help')).toHaveText('Stays the same when the title changes.');

    await page.getByLabel('Title', { exact: true }).fill('A renamed entry');
    await page.getByRole('button', { name: 'Save published entry' }).click();
    await expect(page.getByRole('status')).toContainText('Entry published');
    expect((await published()).map((post) => [post.title, post.slug])).toEqual([['A renamed entry', 'lasting-address']]);

    // A draft with the same title gets its own address and stays private.
    await page.getByRole('button', { name: 'Add blog entry' }).click();
    await page.getByLabel('Title', { exact: true }).fill('Lasting address');
    await page.getByLabel('Post text').fill('A private draft.');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Draft saved');
    const snapshot = await (await page.request.get('/api/admin/content')).json();
    expect(snapshot.posts.find((post) => post.body === 'A private draft.').slug).toBe('lasting-address-2');
    expect((await published()).map((post) => post.slug)).toEqual(['lasting-address']);

    const put = (data) => page.request.put('/api/admin/content', { headers: { ...headers, 'If-Match': String(snapshot.revision) }, data });
    const clashing = structuredClone(snapshot);
    for (const post of clashing.posts) post.slug = 'same-address';
    expect((await put(clashing)).status()).toBe(400);
    const malformed = structuredClone(snapshot);
    malformed.posts[0].slug = '../Not An Address';
    expect((await put(malformed)).status()).toBe(400);
    const cleaned = structuredClone(snapshot);
    cleaned.posts = cleaned.posts.filter((post) => post.title !== 'Lasting address' && post.title !== 'A renamed entry');
    expect((await put(cleaned)).status()).toBe(200);
  });

  test('chooses an entry web address and previews its Markdown safely', async ({ page }) => {
    const help = page.locator('#slug-help');
    const stored = async () => (await (await page.request.get('/api/admin/content')).json());
    await signIn(page);
    await page.getByRole('button', { name: /^Blog entries/ }).click();
    await page.getByRole('button', { name: 'Add blog entry' }).click();
    const address = page.getByLabel('Web address');
    await page.getByLabel('Title', { exact: true }).fill('Café notes, part 1!');
    await expect(address).toHaveValue('cafe-notes-part-1');
    await expect(help).toHaveText('Follows the title until you change it.');

    // Typed text is tidied into an address, and from then on the title leaves it alone.
    await address.fill('First Light');
    await address.blur();
    await expect(address).toHaveValue('first-light');
    await page.getByLabel('Title', { exact: true }).fill('Café notes');
    await expect(address).toHaveValue('first-light');

    await page.getByLabel('Publication date').fill('2026-10-01');
    await page.getByLabel('Short introduction', { exact: true }).fill('A standfirst.');
    await page.getByLabel('Post text').fill('## Morning\n\nSome **bold** and *quiet* words, a [safe link](https://example.com) and a [bad one](javascript:window.__ran=1).\n\n<script>window.__ran = 1</script>\n\n- one\n- two');
    await page.locator('.entry-preview summary').click();
    const preview = page.locator('.preview-article');
    await expect(preview.locator('.preview-title')).toHaveText('Café notes');
    await expect(preview.locator('.preview-date')).toHaveText('Oct 1, 2026');
    await expect(preview.locator('.preview-standfirst')).toHaveText('A standfirst.');
    await expect(preview.getByRole('heading', { name: 'Morning', level: 2 })).toBeVisible();
    await expect(preview.locator('strong')).toHaveText('bold');
    await expect(preview.locator('em')).toHaveText('quiet');
    await expect(preview.getByRole('link', { name: 'safe link' })).toHaveAttribute('href', 'https://example.com');
    await expect(preview.getByRole('link', { name: 'bad one' })).toHaveCount(0);
    await expect(preview).toContainText('<script>window.__ran = 1</script>');
    await expect(preview.locator('script')).toHaveCount(0);
    await expect(preview.locator('li')).toHaveText(['one', 'two']);
    await capture(page, 'entry-preview');
    // The open preview follows the form.
    await page.getByLabel('Post text').fill('Changed **text**.');
    await expect(preview.locator('strong')).toHaveText('text');
    expect(await page.evaluate(() => window.__ran)).toBeUndefined();

    await page.getByRole('button', { name: 'Publish entry', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Entry published');
    expect((await (await page.request.get('/api/content')).json()).posts.map((post) => [post.slug, post.date, post.excerpt])).toEqual([['first-light', '2026-10-01', 'A standfirst.']]);

    // A second entry cannot take a used address; nothing is saved until it has its own.
    await page.getByRole('button', { name: 'Add blog entry' }).click();
    await page.getByLabel('Title', { exact: true }).fill('Another entry');
    await page.getByLabel('Post text').fill('Body.');
    const before = (await stored()).revision;
    await address.fill('first-light');
    await expect(help).toHaveText('Another blog entry already uses this web address.');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    expect(await address.evaluate((input) => input.validity.valid)).toBe(false);
    expect((await stored()).revision).toBe(before);
    await address.fill('first-light-again');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Draft saved');
    expect((await stored()).posts.map((post) => post.slug)).toEqual(expect.arrayContaining(['first-light-again', 'first-light']));

    // Deleting removes the entry from the site.
    for (const name of ['Another entry', 'Café notes']) {
      await page.getByRole('button', { name: new RegExp(name) }).click();
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Delete entry' }).click();
      await expect(page.getByRole('status')).toContainText('Entry deleted');
    }
    expect((await (await page.request.get('/api/content')).json()).posts).toEqual([]);
  });

  test('rejects unauthorized writes, unsafe uploads, unsafe links, and stale saves', async ({ page, request }) => {
    const headers = { Origin: 'http://127.0.0.1:4182', 'X-KK-Admin': '1' };
    expect((await request.put('/api/admin/content', { headers, data: {} })).status()).toBe(401);
    for (const path of ['/data/content.json', '/data/admin-auth.json', '/scripts/serve.mjs', '/.git/config']) expect((await request.get(path)).status()).toBe(404);
    await signIn(page);
    expect((await page.request.put('/api/admin/content', { data: {} })).status()).toBe(403);
    expect((await page.request.post('/api/admin/uploads', { headers, data: { data: Buffer.from('<svg onload="alert(1)"></svg>').toString('base64') } })).status()).toBe(400);
    const snapshot = await (await page.request.get('/api/admin/content')).json();
    const bad = structuredClone(snapshot);
    bad.projects[0].url = 'javascript:alert(1)';
    expect((await page.request.put('/api/admin/content', { headers: { ...headers, 'If-Match': String(snapshot.revision) }, data: bad })).status()).toBe(400);
    const good = await page.request.put('/api/admin/content', { headers: { ...headers, 'If-Match': String(snapshot.revision) }, data: snapshot });
    expect(good.status()).toBe(200);
    expect((await page.request.put('/api/admin/content', { headers: { ...headers, 'If-Match': String(snapshot.revision) }, data: snapshot })).status()).toBe(409);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    expect((await page.request.get('/api/admin/content')).status()).toBe(401);
  });

  test('keeps editing usable at phone width and warns about unsaved navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await expect(page.getByLabel('Tagline', { exact: true })).toBeVisible();
    await page.getByLabel('Tagline', { exact: true }).fill('Unsaved text');
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: /^Projects/ }).click();
    await expect(page.getByRole('heading', { name: 'Page text' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    expect((await page.getByRole('link', { name: 'View website' }).boundingBox()).height).toBeGreaterThanOrEqual(44);
    await page.getByLabel('Tagline', { exact: true }).fill('A place for curious people.');
    await page.getByLabel('About text', { exact: true }).fill('KoreoKorp is a small corner of the internet: posts, projects, and a chat room from 2003 living inside a modern website. No accounts, no feed. Pick a name and say hi.');
    await page.getByRole('button', { name: 'Save page text' }).click();
    await expect(page.getByRole('status')).toContainText('Your changes are live');
    await capture(page, 'mobile');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await capture(page, 'desktop');
    await page.getByRole('button', { name: /^Blog entries/ }).click();
    await page.getByRole('button', { name: /A note from the workshop/ }).click();
    expect((await page.locator('.entry-preview summary').boundingBox()).height).toBeGreaterThanOrEqual(44);
    await capture(page, 'entry-desktop');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await capture(page, 'entry-mobile');
  });

  test('preserves an unsaved form when a session expires', async ({ page }) => {
    await signIn(page);
    await page.getByLabel('About heading', { exact: true }).fill('A little about us');
    await page.context().clearCookies();
    await page.getByRole('button', { name: 'Save page text' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByLabel('About heading', { exact: true })).toHaveValue('A little about us');
    await page.getByRole('button', { name: 'Save page text' }).click();
    await expect(page.getByRole('status')).toContainText('Your changes are live');
  });

  test('retains saved content across server restarts', async ({ request }) => {
    await stopServer(server);
    server = await startServer(4182);
    const content = await (await request.get('/api/content')).json();
    expect(content.pages.landingTag).toBe('A place for curious people.');
    expect(content.posts).toHaveLength(0);
  });

  test('production uses the admin host, secure cookies, CSRF checks, and login throttling', async ({ request }) => {
    const productionServer = await startServer(4183, 'production');
    const base = 'http://127.0.0.1:4183';
    const headers = { Host: 'adctrl.koreokorp.com', Origin: 'https://adctrl.koreokorp.com', 'X-KK-Admin': '1' };
    try {
      const login = await request.get(`${base}/`, { headers });
      expect(await login.text()).toContain('Welcome back.');
      expect(login.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
      expect(login.headers()['strict-transport-security']).toBe('max-age=31536000');
      expect((await request.get(`${base}/admin`, { headers: { Host: 'koreokorp.com' } })).status()).toBe(404);
      expect((await request.get(`${base}/api/admin/content`, { headers: { Host: 'koreokorp.com' } })).status()).toBe(404);
      expect((await request.post(`${base}/api/admin/login`, { headers: { ...headers, Origin: 'https://evil.example' }, data: { password } })).status()).toBe(403);
      const signedIn = await request.post(`${base}/api/admin/login`, { headers, data: { password } });
      expect(signedIn.status()).toBe(200);
      const cookie = signedIn.headers()['set-cookie'];
      expect(cookie).toMatch(/^__Host-kk_admin=/);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Secure');
      const authenticated = { ...headers, Cookie: cookie.split(';')[0] };
      expect((await request.get(`${base}/api/admin/content`, { headers: authenticated })).status()).toBe(200);
      expect((await request.post(`${base}/api/admin/logout`, { headers: authenticated, data: {} })).status()).toBe(200);
      expect((await request.get(`${base}/api/admin/content`, { headers: authenticated })).status()).toBe(401);
      for (let attempt = 0; attempt < 5; attempt += 1) expect((await request.post(`${base}/api/admin/login`, { headers, data: { password: 'incorrect' } })).status()).toBe(401);
      expect((await request.post(`${base}/api/admin/login`, { headers, data: { password } })).status()).toBe(429);
    } finally { await stopServer(productionServer); }
  });
});
