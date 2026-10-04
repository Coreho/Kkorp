import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const defaultDocument = 'mockups/koreokorp-v2/index.html';
const portFlag = process.argv.indexOf('--port');
const requestedPort = portFlag >= 0 ? process.argv[portFlag + 1] : process.env.PORT;
const port = Number(requestedPort || 4173);
const host = process.env.HOST || '127.0.0.1';

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  console.error(`Invalid port: ${requestedPort}`);
  process.exit(1);
}

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

function resolveRequestPath(pathname) {
  const relativePath = pathname === '/'
    ? defaultDocument
    : decodeURIComponent(pathname).replace(/^\/+/, '');
  const filePath = resolve(repositoryRoot, relativePath);
  const fromRoot = relative(repositoryRoot, filePath);

  if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) return null;
  return filePath;
}

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || host}`);
    let filePath = resolveRequestPath(url.pathname);
    if (!filePath) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    const fileStats = await stat(filePath);
    if (fileStats.isDirectory()) filePath = join(filePath, 'index.html');
    const body = await readFile(filePath);

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': body.length,
      'Content-Type': contentTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const statusCode = error?.code === 'ENOENT' ? 404 : 500;
    response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(statusCode === 404 ? 'Not found' : 'Internal server error');
  }
});

server.listen(port, host, () => {
  console.log(`KoreoKorp preview: http://${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
