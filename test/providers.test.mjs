import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir, mkdir, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseKeys, readKeys } from '../src/config.mjs';
import { normalizeGames, normalizeOdds, fetchProvider, gamesRequest, oddsRequest } from '../src/providers.mjs';
import { checkBudget, collect, dataStatus } from '../src/collection.mjs';
const observedAt = '2026-10-24T14:00:00Z';
const game = { id: 42, season: 2025, date: '2026-01-01', datetime: '2026-01-01T23:00:00Z', status_state: 'final', home_team: { id:1, full_name:'Home' }, visitor_team: { id:2, full_name:'Away' }, home_team_score:110, visitor_team_score:100 };
const payload = () => [{ id:'event-1', home_team:'Home', away_team:'Away', commence_time:'2099-10-24T23:00:00Z', bookmakers:[{ key:'fanduel', last_update:'2026-10-24T13:59:00Z', markets:[{ key:'h2h', outcomes:[{name:'Home',price:-110},{name:'Away',price:100}] }, { key:'spreads',outcomes:[{name:'Home',price:-110,point:-3.5},{name:'Away',price:-110,point:3.5}] }] }] }];
const fakeKey = 'synthetic_key_1234';
async function temporary(work) {
  const path = await mkdtemp(join(tmpdir(), 'nba-edge-test-'));
  try { return await work(path); } finally { await rm(path, { recursive:true, force:true }); }
}
test('key parser accepts only allowed names and never executes content', async () => {
  assert.deepEqual(parseKeys('# local\nBALLDONTLIE_API_KEY=abc-123\nODDS_API_KEY=\n'), { BALLDONTLIE_API_KEY:'abc-123', ODDS_API_KEY:'' });
  for (const value of ['OTHER=x','ODDS_API_KEY=$(whoami)','ODDS_API_KEY=a\nODDS_API_KEY=b']) assert.throws(() => parseKeys(value));
  await temporary(async root => {
    await writeFile(join(root,'.env'),`ODDS_API_KEY=${fakeKey}\n`,{mode:0o600});
    assert.equal((await readKeys(root,{})).ODDS_API_KEY,fakeKey);
    await chmod(join(root,'.env'),0o644);
    await assert.rejects(readKeys(root,{}), /owner-only/);
  });
});
test('game pages preserve cursor and avoid inventing final scores', () => {
  const result = normalizeGames({ data:[game], meta:{next_cursor:100} },observedAt);
  assert.equal(result.nextCursor,100); assert.equal(result.paginationExhausted,false);
  assert.equal(result.games[0].observedAt,observedAt);
  const scheduled = normalizeGames({data:[{...game,status_state:'scheduled',home_team_score:0,visitor_team_score:0}],meta:{}},observedAt);
  assert.equal(scheduled.games[0].homeScore,null);
  assert.throws(() => normalizeGames({data:[game,game],meta:{}},observedAt));
  assert.throws(() => normalizeGames({data:[{...game,home_team_score:100}],meta:{}},observedAt));
});
test('odds normalize matching sides, spread sign, source age and unverified geography', () => {
  const result = normalizeOdds(payload(),observedAt);
  assert.equal(result.quotes.length,4);
  assert.equal(result.quotes[2].line,-3.5);
  assert.equal(result.quotes[0].ageSeconds,60);
  assert.match(result.quotes[0].geography,/unverified/);
  assert.deepEqual(result.booksPresent,['FanDuel']);
});
test('in-play, unknown books, wrong sides, mismatched lines and future updates cannot become valid quotes', () => {
  const live = payload(); live[0].commence_time='2026-10-24T13:00:00Z';
  assert.equal(normalizeOdds(live,observedAt).quotes.length,0);
  const unknown = payload(); unknown[0].bookmakers[0].key='bet365_au';
  assert.equal(normalizeOdds(unknown,observedAt).quotes.length,0);
  for (const mutate of [p=>p[0].bookmakers[0].markets[0].outcomes[0].name='Wrong',p=>p[0].bookmakers[0].markets[1].outcomes[1].point=4,p=>p[0].bookmakers[0].last_update='2026-10-24T15:00:00Z']) {
    const p=payload();mutate(p);assert.throws(()=>normalizeOdds(p,observedAt));
  }
  assert.equal(normalizeOdds([],observedAt).quotes.length,0);
});
test('requests stay bounded to supported free endpoints and exact three-book markets', () => {
  const games=gamesRequest(2025,100);
  assert.equal(games.searchParams.get('cursor'),'100');
  assert.throws(()=>gamesRequest(2025,-1));
  const odds=oddsRequest();
  assert.equal(odds.searchParams.get('markets'),'h2h,spreads');
  assert.equal(odds.searchParams.get('bookmakers'),'fanduel,draftkings,betmgm');
  assert.equal(odds.searchParams.has('apiKey'),false);
});
test('network and HTTP error messages cannot echo keys; redirects disabled', async () => {
  await assert.rejects(fetchProvider('oddsapi',oddsRequest(),fakeKey,async()=>{throw new Error(fakeKey);}),error=>!error.message.includes(fakeKey)&&error.code==='NETWORK_ERROR');
  await assert.rejects(fetchProvider('oddsapi',oddsRequest(),fakeKey,async()=>new Response(fakeKey,{status:401})),error=>!error.message.includes(fakeKey)&&error.code==='ACCESS_DENIED');
  const value=await fetchProvider('oddsapi',oddsRequest(),fakeKey,async(url,options)=>{
    assert.equal(url.searchParams.get('apiKey'),fakeKey); assert.equal(options.redirect,'error');
    return new Response(JSON.stringify({echo:fakeKey}),{headers:{'x-requests-remaining':'498','x-untrusted':fakeKey}});
  });
  assert.equal(value.payload.echo,'[REDACTED]');
  assert.equal(value.payloadRedacted,true);
  assert.equal(JSON.stringify(value).includes(fakeKey),false);
  assert.equal(value.safeHeaders['x-requests-remaining'],498);
  await assert.rejects(fetchProvider('oddsapi','https://attacker.example/',fakeKey));
});
test('local credit/rate guards stop before another request', () => {
  const attempts=Array.from({length:4},(_,i)=>({provider:'oddsapi',at:`2026-10-24T0${i}:00:00Z`,reservedCredits:2}));
  assert.throws(()=>checkBudget({attempts},'oddsapi',observedAt),/budget/);
  assert.throws(()=>checkBudget({attempts:[{provider:'balldontlie',at:'2026-10-24T13:59:59Z'}]},'balldontlie',observedAt),/13 seconds/);
});
test('successful capture is immutable, private, secret-free and distinct from model readiness', async () => {
  await temporary(async root=>{
    const result=await collect('oddsapi',{root,environment:{ODDS_API_KEY:fakeKey},fetchImpl:async()=>new Response(JSON.stringify(payload()),{headers:{'x-requests-remaining':'498'}})});
    assert.equal(result.records,4);assert.equal(result.geographyVerified,false);
    const files=await readdir(join(root,'data','snapshots','oddsapi'));
    assert.equal(files.length,1);
    const saved=await readFile(join(root,'data','snapshots','oddsapi',files[0]),'utf8');
    assert.equal(saved.includes(fakeKey),false);
    assert.equal(JSON.parse(saved).normalized.quotes.length,4);
    const status=await dataStatus(root,{ODDS_API_KEY:fakeKey});
    assert.equal(status.oddsapi.keyConfigured,true);assert.equal(status.model,'Not trained');
    assert.equal(JSON.stringify(status).includes(fakeKey),false);
    await assert.rejects(collect('oddsapi',{root,environment:{ODDS_API_KEY:fakeKey},fetchImpl:async()=>{throw new Error('must not fetch');}}),/60 seconds/);
  });
});
test('missing keys and restricted providers send no request; missing vs corrupt index is explicit',async()=>{
  await temporary(async root=>{
    const options={root,environment:{},fetchImpl:async()=>{throw new Error('must not fetch');}};
    await assert.rejects(collect('oddsapi',options),/No local provider key/);
    await assert.rejects(collect('therundown',options),/archival collection is disabled/);
    assert.equal((await dataStatus(root,{})).oddsapi.lastCollection,null);
    await mkdir(join(root,'data'));await writeFile(join(root,'data','collection-index.json'),'corrupt');
    assert.equal((await dataStatus(root,{})).indexError,true);
  });
});
