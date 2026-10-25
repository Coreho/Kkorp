import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

for (const failing of [false, true]) {
  test(`owner health check ${failing ? 'reports fallback and fails' : 'passes all five checks'}`, async () => {
    const server = createServer((request, response) => {
      if (request.url === '/') {
        response.writeHead(200, { 'content-type': 'text/html' });
        response.end('<!doctype html><html><body>Site</body></html>');
      } else {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify(request.url === '/api/content'
          ? (failing ? { pages: {} } : { pages: {}, projects: [], posts: [] }) : { ok: !failing }));
      }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    try {
      const child = spawn(process.execPath, ['scripts/check-live-health.mjs'], {
        env: { ...process.env, PUBLIC_ORIGIN: origin, ADMIN_ORIGIN: origin }, stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', (chunk) => { output += chunk; });
      const code = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', resolve);
      });
      expect(code).toBe(failing ? 1 : 0);
      expect(output.trim().split('\n').map((line) => line.trim())).toEqual([
        'public site: OK', `public app health: ${failing ? 'FAIL' : 'OK'}`,
        failing ? 'public content: FALLBACK (visitors see bundled default copy)' : 'public content: live',
        `control health: ${failing ? 'FAIL' : 'OK'}`, 'editor: OK',
      ]);
    } finally { await new Promise((resolve) => server.close(resolve)); }
  });
}
