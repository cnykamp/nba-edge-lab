import test from 'node:test';
import assert from 'node:assert/strict';
import { makeServer } from '../server.mjs';
test('serve app but never private repository paths; no external scripts', async () => {
  const server = makeServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy'), /connect-src 'self'/);
    assert.match(await page.text(), /No recommendation available/);
    for (const path of ['/app.mjs', '/domain.mjs', '/style.css']) assert.equal((await fetch(base + path)).status, 200);
    for (const path of ['/.env', '/.git/config', '/data/bets.json', '/README.md', '/%2e%2e/README.md']) assert.equal((await fetch(base + path)).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
