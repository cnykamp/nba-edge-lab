import {request} from 'node:http';
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

test('paper actions require local same-origin intent and serialize operations',async()=>{
  const root=await mkdtemp(join(tmpdir(),'nba-paper-http-'));let calls=0,finish;
  const gate=new Promise(resolve=>{finish=resolve;});
  const server=makeServer({root,environment:{},paperOperation:async()=>{calls++;await gate;return {forecasts:0};}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const base=`http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(base+'/api/paper-board')).status,200);
    const spoofed=await new Promise((resolve,reject)=>{const req=request(base+'/api/paper-board',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});
    assert.equal(spoofed,403);
    assert.equal((await fetch(base+'/api/paper-capture',{method:'POST'})).status,403);
    const headers={'Content-Type':'application/json','X-NBA-Research':'manual','Origin':base};
    assert.equal((await fetch(base+'/api/paper-capture',{method:'POST',headers:{...headers,Origin:'https://attacker.example'},body:'{}'})).status,403);
    assert.equal((await fetch(base+'/api/paper-capture',{method:'POST',headers,body:'{}'})).status,202);
    assert.equal((await fetch(base+'/api/paper-results',{method:'POST',headers,body:'{}'})).status,409);
    assert.equal(calls,1);assert.equal((await (await fetch(base+'/api/paper-board')).json()).operation.running,true);
    finish();
  }finally{finish();await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});}
});

test('availability HTTP review requires same-origin intent and appends only validated source observations',async()=>{
  const {appendLedger,readLedger}=await import('../src/paper-ledger.mjs');
  const root=await mkdtemp(join(tmpdir(),'nba-review-http-'));
  await appendLedger(root,{type:'capture',games:[{providerGameId:'fixture',home:'Home',away:'Away'}]});
  const server=makeServer({root,environment:{}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const base=`http://127.0.0.1:${server.address().port}`,headers={'Origin':base,'Content-Type':'application/json','X-NBA-Research':'manual'};
    const payload={providerGameId:'fixture',sourceUrl:'https://official.nba.com/nba-injury-report-2026-27-season/',publishedAt:'2026-01-01T10:00:00Z',reviewState:'incomplete',players:[],notes:'Synthetic test'};
    assert.equal((await fetch(base+'/api/candidate-status')).status,200);
    assert.equal((await fetch(base+'/api/availability',{method:'POST',body:JSON.stringify(payload)})).status,403);
    assert.equal((await fetch(base+'/api/availability',{method:'POST',headers,body:'{'})).status,400);
    assert.equal((await fetch(base+'/api/availability',{method:'POST',headers,body:JSON.stringify({...payload,sourceUrl:'https://example.com/'})})).status,400);
    assert.equal((await fetch(base+'/api/availability',{method:'POST',headers,body:JSON.stringify(payload)})).status,200);
    const records=await readLedger(root);assert.equal(records.length,2);assert.equal(records[1].entry.type,'injury_review');assert.ok(Date.parse(records[1].entry.observedAt)>Date.parse(payload.publishedAt));
  }finally{await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});}
});
