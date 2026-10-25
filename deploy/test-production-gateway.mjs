// Loopback-only test gateway: exercise the Next candidate against real public content.
import { createServer, request } from 'node:http';
import { readFileSync } from 'node:fs';
const fixture = process.env.CONTENT_FIXTURE ? readFileSync('/fixture.json') : null;
createServer((incoming, response) => {
  if (fixture && incoming.url === '/api/content') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(fixture);
    return;
  }
  const content = incoming.url === '/api/content' || incoming.url.startsWith('/uploads/');
  const upstream = request({
    hostname: content ? 'koreokorp-control' : 'koreokorp-admin-candidate',
    port: content ? 4173 : 3000,
    path: incoming.url,
    method: incoming.method,
    headers: { ...incoming.headers, host: content ? 'koreokorp.com' : incoming.headers.host },
  }, (result) => {
    response.writeHead(result.statusCode, result.headers);
    result.pipe(response);
  });
  upstream.on('error', () => { response.writeHead(502); response.end(); });
  incoming.pipe(upstream);
}).listen(4181, '0.0.0.0');
