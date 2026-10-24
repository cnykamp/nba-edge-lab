import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Exact routes avoid exposing repository files, credentials, or raw data.
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.mjs', ['app.mjs', 'text/javascript; charset=utf-8']],
  ['/domain.mjs', ['domain.mjs', 'text/javascript; charset=utf-8']],
]);
export function makeServer() {
  return createServer(async (req, res) => {
    const route = routes.get(req.url);
    if (!route || !['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(404); return res.end('Not found');
    }
    try {
      const body = await readFile(new URL(`./public/${route[0]}`, import.meta.url));
      res.writeHead(200, {
        'Content-Type': route[1], 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(500); res.end('Unable to load dashboard');
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const server = makeServer();
  server.listen(port, '127.0.0.1', () => console.log(`NBA Edge Lab: http://127.0.0.1:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
