import test from 'node:test';
import assert from 'node:assert/strict';
import { makeServer } from '../server.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('serve app but never private repository paths; no external scripts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nba-edge-server-test-'));
  const secret = 'synthetic_hidden_key_1234';
  const server = makeServer({ root, environment: { ODDS_API_KEY: secret } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy'), /connect-src 'self'/);
    assert.match(await page.text(), /No recommendation available/);
    const state = await (await fetch(base + '/api/data-status')).json();
    assert.equal(state.oddsapi.keyConfigured, true);
    assert.equal(state.oddsapi.lastCollection, null);
    assert.equal(JSON.stringify(state).includes(secret), false);
    const research=await (await fetch(base + '/api/research-status')).json();
    assert.equal(research.available,false);
    assert.equal(research.recommendationsEnabled,false);
    for (const path of ['/app.mjs', '/domain.mjs', '/style.css']) assert.equal((await fetch(base + path)).status, 200);
    for (const path of ['/.env', '/.git/config', '/data/bets.json', '/artifacts/baseline-001/model.json', '/README.md', '/%2e%2e/README.md']) assert.equal((await fetch(base + path)).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); }
});
