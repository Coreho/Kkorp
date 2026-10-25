import { createServer } from 'node:http';
import { mkdir, readFile, realpath, stat, unlink, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
import { verifyPassword } from './admin-auth.mjs';
import { contentDirectory, fail, loadContent, saveContent } from './content-store.mjs';
import { assignSlugs } from '../mockups/koreokorp-v2/content-model.js';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const siteRoot = resolve(repositoryRoot, 'mockups/koreokorp-v2');
const portFlag = process.argv.indexOf('--port');
const port = Number((portFlag >= 0 ? process.argv[portFlag + 1] : process.env.PORT) || 4173);
const host = process.env.HOST || '127.0.0.1';
const production = process.env.NODE_ENV === 'production';
const adminOrigin = new URL(process.env.ADMIN_ORIGIN || 'https://adctrl.koreokorp.com');
const publicOrigin = new URL(process.env.PUBLIC_ORIGIN || 'https://koreokorp.com');
if (production && (adminOrigin.protocol !== 'https:' || publicOrigin.protocol !== 'https:' || (!['127.0.0.1', '::1'].includes(host) && process.env.PRIVATE_PROXY_NETWORK !== '1'))) throw new Error('Production requires HTTPS origins and loopback HOST, or PRIVATE_PROXY_NETWORK=1 on an isolated proxy network without public port mappings.');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port.');
let passwordHash = process.env.ADMIN_PASSWORD_HASH;
if (!passwordHash) {
  try { passwordHash = JSON.parse(await readFile(resolve(contentDirectory, 'admin-auth.json'), 'utf8')).hash; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
if (production && !passwordHash) throw new Error('Set the admin password with npm run admin:password before starting production.');
const cookieName = production ? '__Host-kk_admin' : 'kk_admin';
const sessions = new Map();
const attempts = new Map();
const sessionLifetime = 8 * 60 * 60 * 1000;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
const cleanup = setInterval(() => {
  for (const [key, value] of sessions) if (value < Date.now()) sessions.delete(key);
  for (const [key, value] of attempts) if (value.until < Date.now()) attempts.delete(key);
}, 60000);
cleanup.unref();

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= 2147483647 ? number : fallback;
}
const healthInterval = positiveInteger(process.env.HEALTH_CHECK_INTERVAL_MS, 60000);
const healthThreshold = positiveInteger(process.env.HEALTH_CHECK_FAILURE_THRESHOLD, 3);
const healthCacheMs = positiveInteger(process.env.HEALTH_CACHE_MS, 5000);
let httpHealthProbe;
let httpHealthResult = false;
let httpHealthExpires = 0;
let healthTimer;
let healthFailures = 0;
let shuttingDown = false;

async function probeContentDirectory() {
  const probe = resolve(contentDirectory, `.health-${randomUUID()}`);
  const value = randomUUID();
  let created = false;
  let ok = false;
  try {
    await writeFile(probe, value, { flag: 'wx', mode: 0o600 });
    created = true;
    if (await readFile(probe, 'utf8') !== value) throw new Error('Probe mismatch');
    try { JSON.parse(await readFile(resolve(contentDirectory, 'content.json'), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    ok = true;
  } catch { /* Only the boolean health result is public. */ }
  finally {
    if (created) {
      try { await unlink(probe); }
      catch { ok = false; }
    }
  }
  return ok;
}

async function httpContentHealth() {
  if (httpHealthProbe) return httpHealthProbe;
  if (performance.now() < httpHealthExpires) return httpHealthResult;
  httpHealthProbe = probeContentDirectory().then((ok) => {
    httpHealthResult = ok;
    httpHealthExpires = performance.now() + healthCacheMs;
    return ok;
  }).finally(() => { httpHealthProbe = undefined; });
  return httpHealthProbe;
}

function shutdown(code) {
  shuttingDown = true;
  clearTimeout(healthTimer);
  clearInterval(cleanup);
  server.close(() => process.exit(code));
  server.closeAllConnections();
}

function scheduleHealthCheck() {
  // A single recursive timer prevents overlapping probes on slow storage.
  healthTimer = setTimeout(async () => {
    const ok = await probeContentDirectory();
    if (shuttingDown) return;
    healthFailures = ok ? 0 : healthFailures + 1;
    if (healthFailures >= healthThreshold) {
      console.error('Content storage health failed repeatedly; exiting for restart.');
      shutdown(1);
    } else scheduleHealthCheck();
  }, healthInterval);
  healthTimer.unref();
}

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}
async function body(request, limit = 2 * 1024 * 1024) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw fail(415, 'Send JSON data.');
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw fail(413, 'This upload is too large. Use an image under 5 MB.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw fail(400, 'Invalid JSON data.'); }
}
function session(request) {
  const token = (request.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  return token && (sessions.get(token) || 0) > Date.now() ? token : null;
}
function setCookie(response, token, age) {
  response.setHeader('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${production ? '; Secure' : ''}`);
}
async function upload(input) {
  if (typeof input.data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(input.data)) throw fail(400, 'Choose a PNG, JPEG, WebP, or GIF image.');
  const data = Buffer.from(input.data, 'base64');
  if (!data.length || data.length > 5 * 1024 * 1024) throw fail(413, 'Use an image under 5 MB.');
  let extension;
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extension = 'png';
  else if (data[0] === 255 && data[1] === 216 && data[2] === 255) extension = 'jpg';
  else if (['GIF87a', 'GIF89a'].includes(data.subarray(0, 6).toString())) extension = 'gif';
  else if (data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP') extension = 'webp';
  else throw fail(400, 'Choose a PNG, JPEG, WebP, or GIF image. SVG and other files are not supported.');
  const name = `${randomUUID()}.${extension}`;
  await mkdir(resolve(contentDirectory, 'uploads'), { recursive: true, mode: 0o700 });
  await writeFile(resolve(contentDirectory, 'uploads', name), data, { mode: 0o600 });
  return { url: `/uploads/${name}` };
}

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'same-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (production) response.setHeader('Strict-Transport-Security', 'max-age=31536000');
  try {
    // This exact GET is host- and session-independent for container probes.
    if (request.method === 'GET' && request.url?.split('?')[0] === '/api/health') {
      const ok = await httpContentHealth();
      return json(response, ok ? 200 : 503, { ok, service: 'koreokorp-control' });
    }
    const authority = request.headers.host || '';
    const local = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(authority);
    const isAdminHost = authority === adminOrigin.host;
    if (!isAdminHost && authority !== publicOrigin.host && authority !== `www.${publicOrigin.host}` && !(local && !production)) throw fail(421, 'Unknown host.');
    const url = new URL(request.url || '/', `http://${authority}`);
    const path = decodeURIComponent(url.pathname);
    const adminRequest = path.startsWith('/api/admin/') || path.startsWith('/admin') || (isAdminHost && path === '/');
    if (production && adminRequest && !isAdminHost) throw fail(404, 'Not found.');
    if (!['GET', 'HEAD'].includes(request.method)) {
      const expectedOrigin = isAdminHost ? adminOrigin.origin : `http://${authority}`;
      if (request.headers.origin !== expectedOrigin || request.headers['x-kk-admin'] !== '1') throw fail(403, 'Request blocked. Open the admin page and try again.');
    }
    if (adminRequest) response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (path === '/api/admin/login' && request.method === 'POST') {
      if (!passwordHash) throw fail(503, 'Admin access is not configured. Run npm run admin:password on the server, then restart it.');
      // Caddy is the only production peer; it overwrites X-Forwarded-For.
      const address = production ? (request.headers['x-forwarded-for'] || request.socket.remoteAddress) : request.socket.remoteAddress;
      const key = String(address).split(',').at(-1).trim();
      const recent = attempts.get(key);
      const attempt = recent && recent.until > Date.now() ? recent : { count: 0, until: Date.now() + 15 * 60000 };
      if (attempt.count >= 5) {
        response.setHeader('Retry-After', String(Math.ceil((attempt.until - Date.now()) / 1000)));
        throw fail(429, 'Too many attempts. Try again in 15 minutes.');
      }
      attempt.count += 1;
      attempts.set(key, attempt);
      const input = await body(request, 4096);
      if (!await verifyPassword(input.password, passwordHash)) throw fail(401, 'Incorrect password. Try again.');
      attempts.delete(key);
      if (sessions.size >= 1000) sessions.delete(sessions.keys().next().value);
      const token = randomBytes(32).toString('hex');
      sessions.set(token, Date.now() + sessionLifetime);
      setCookie(response, token, sessionLifetime / 1000);
      return json(response, 200, { ok: true });
    }
    if (path.startsWith('/api/admin/')) {
      const token = session(request);
      if (!token) throw fail(401, 'Sign in to continue.');
      if (path === '/api/admin/logout' && request.method === 'POST') {
        sessions.delete(token);
        setCookie(response, '', 0);
        return json(response, 200, { ok: true });
      }
      if (path === '/api/admin/content' && request.method === 'GET') return json(response, 200, await loadContent());
      if (path === '/api/admin/content' && request.method === 'PUT') return json(response, 200, await saveContent(await body(request), request.headers['if-match']));
      if (path === '/api/admin/uploads' && request.method === 'POST') return json(response, 201, await upload(await body(request, 7 * 1024 * 1024)));
      throw fail(404, 'Not found.');
    }
    if (path === '/api/content' && request.method === 'GET') {
      const content = await loadContent();
      return json(response, 200, { pages: content.pages, posts: assignSlugs(content.posts).filter((item) => item.status === 'published'), projects: content.projects.filter((item) => item.status === 'published') });
    }
    if (!['GET', 'HEAD'].includes(request.method)) throw fail(405, 'Method not allowed.');
    let filePath;
    let allowedRoot;
    if (path.startsWith('/uploads/') && /^\/uploads\/[a-f0-9-]+\.(png|jpg|gif|webp)$/.test(path)) {
      allowedRoot = resolve(contentDirectory, 'uploads');
      filePath = resolve(allowedRoot, path.slice('/uploads/'.length));
    } else if (path.startsWith('/assets/')) {
      allowedRoot = resolve(repositoryRoot, 'assets');
      filePath = resolve(allowedRoot, path.slice('/assets/'.length));
    } else {
      allowedRoot = siteRoot;
      const route = (path === '/admin' || path === '/admin/' || (isAdminHost && path === '/')) ? '/admin/index.html' : path;
      const relativePath = route === '/' ? 'index.html' : route.replace(/^\/mockups\/koreokorp-v2\//, '').replace(/^\/+/, '');
      filePath = resolve(siteRoot, relativePath);
      if (!['.html', '.js', '.css'].includes(extname(filePath))) throw fail(404, 'Not found.');
    }
    const canonical = await realpath(filePath);
    const fromRoot = relative(await realpath(allowedRoot), canonical);
    if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) throw fail(404, 'Not found.');
    if (!(await stat(canonical)).isFile()) throw fail(404, 'Not found.');
    const bytes = await readFile(canonical);
    response.writeHead(200, { 'Content-Type': mime[extname(canonical)] || 'application/octet-stream', 'Content-Length': bytes.length });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    const status = error.status || (['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500);
    if (status === 500) console.error('Request failed:', error.code || error.name);
    json(response, status, { error: error.status ? error.message : status === 404 ? 'Not found.' : 'Could not complete the request. Try again.' });
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.listen(port, host, () => {
  scheduleHealthCheck();
  console.log(`KoreoKorp preview: http://${host}:${port}`);
  if (!passwordHash) console.log('Admin login is locked. Run npm run admin:password, then restart.');
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => shutdown(0));
