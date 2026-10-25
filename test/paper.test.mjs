import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {buildFeatures} from '../src/baseline.mjs';
import {gamesRequest} from '../src/providers.mjs';
import {easternDate,forecastGame,matchMarket,primaryForecasts,paperMetrics} from '../src/paper-domain.mjs';
import {hash,appendLedger,readLedger} from '../src/paper-ledger.mjs';
import {runPaperOperation,paperBoard,recordSettlements,loadFrozenBaseline} from '../src/paper-engine.mjs';
const config=JSON.parse(await readFile(new URL('../experiments/baseline-001.json',import.meta.url),'utf8'));
const policy=JSON.parse(await readFile(new URL('../experiments/forward-001.json',import.meta.url),'utf8'));
const now='2026-10-25T15:00:00Z';
const game={providerGameId:'g1',season:2026,gameDate:'2026-10-25',scheduledStart:'2026-10-25T23:00:00Z',home:'Home',away:'Away',homeTeamId:1,awayTeamId:2,status:'scheduled',postseason:false,postponed:false,observedAt:now};
const history=Array.from({length:35},(_,i)=>({id:'hist'+i,season:2025,gameDate:new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),homeTeamId:1,awayTeamId:2,homeScore:i%2?110:100,awayScore:105}));
const model={logistic:{weights:[.2,.1,.1,.1]},margin:{weights:[2,1,1,1]}};
const quote=(book='FanDuel',market='Moneyline')=>['Home','Away'].map((selection,i)=>({providerGameId:'odds1',home:'Home',away:'Away',scheduledStart:game.scheduledStart,selection,book,market,line:market==='Spread'?(i?3.5:-3.5):null,americanOdds:i?120:-140,sourceUpdatedAt:now,observedAt:now,quoteId:book+market+i}));
const bundle={config,model,history,historySnapshotHashes:[],modelHash:'synthetic-model',configHash:'synthetic-config'};
async function temporary(work) {const root=await mkdtemp(join(tmpdir(),'nba-paper-test-'));try{return await work(root);}finally{await rm(root,{recursive:true,force:true});}}
test('date filtering uses Eastern midnight and date-range requests validate dates',()=>{
  assert.equal(easternDate('2026-10-26T02:00:00Z'),'2026-10-25');
  const request=gamesRequest(2026,null,{startDate:'2026-10-20',endDate:'2026-10-26'});
  assert.equal(request.searchParams.get('start_date'),'2026-10-20');
  assert.throws(()=>gamesRequest(2026,null,{startDate:'2026-02-30',endDate:'2026-10-26'}));
});
test('forward target exactly reuses frozen features without seeing its own score',()=>{
  const forecast=forecastGame(game,history,[game],model,config,policy,now);
  const expected=buildFeatures([...history,{...game,id:game.providerGameId,homeScore:1,awayScore:0}],config).find(r=>r.id==='g1');
  assert.deepEqual(forecast.featureVector,expected.x);assert.equal(forecast.homeProbability+forecast.awayProbability,1);
  assert.deepEqual(forecast,forecastGame({...game,homeScore:300,awayScore:1},history,[game],model,config,policy,now));
  assert.equal(forecastGame({...game,status:'final'},history,[],model,config,policy,now).available,false);
  assert.equal(forecastGame({...game,scheduledStart:now},history,[],model,config,policy,now).available,false);
  assert.throws(()=>forecastGame({...game,observedAt:'2026-10-26T00:00:00Z'},history,[],model,config,policy,now),/cutoff/);
  const unresolved={...game,providerGameId:'prior',gameDate:'2026-10-24',status:'unknown'};
  assert.match(forecastGame(game,history,[unresolved],model,config,policy,now).reason,/unresolved/);
});
test('market pairs stay within book and event; stale, reversed and ambiguous events do not match',()=>{
  const q=quote();const m=matchMarket(game,q,policy,now);
  assert.equal(m.available,true);
  const h=140/240,a=100/220;assert.ok(Math.abs(m.meanHomeNoVig-h/(h+a))<1e-12);
  assert.equal(matchMarket(game,[q[0],{...q[1],book:'DraftKings'}],policy,now).available,false);
  assert.equal(matchMarket(game,q.map(q=>({...q,sourceUpdatedAt:'2026-10-25T14:00:00Z'})),policy,now).available,false);
  assert.equal(matchMarket(game,q.map(q=>({...q,observedAt:'2026-10-25T14:00:00Z'})),policy,now).available,false);
  assert.equal(matchMarket(game,q.map(q=>({...q,home:'Away',away:'Home'})),policy,now).available,false);
  assert.equal(matchMarket(game,[...q,...q.map(q=>({...q,providerGameId:'other'}))],policy,now).reason,'Ambiguous odds event');
  assert.equal(matchMarket(game,[...q,q[0]],policy,now).books.length,0);
  assert.equal(matchMarket(game,quote('FanDuel','Spread').map((q,i)=>({...q,line:i?4:-3.5})),policy,now).available,false);
});
test('ledger detects edits, omissions and preserves exclusive records',async()=>temporary(async root=>{
  await appendLedger(root,{type:'example',x:1});await appendLedger(root,{type:'example',x:2});
  const all=await readLedger(root);assert.equal(all[1].previousHash,all[0].hash);
  const path=join(root,'data/paper/ledger/00000001.json');
  const value=JSON.parse(await readFile(path,'utf8'));value.entry.x=99;await writeFile(path,JSON.stringify(value));
  await assert.rejects(readLedger(root),/integrity/);
}));
test('primary metrics never replace the original or duplicate a game; corrections append',async()=>temporary(async root=>{
  const g={...game,forecast:{available:true,homeProbability:.6},market:{meanHomeNoVig:.55}};
  await appendLedger(root,{type:'capture',policyId:policy.id,id:'first',createdAt:now,games:[g]});
  await appendLedger(root,{type:'capture',policyId:policy.id,id:'later',createdAt:'2026-10-25T16:00:00Z',games:[{...g,forecast:{available:true,homeProbability:.9}}]});
  const before=await readFile(join(root,'data/paper/ledger/00000001.json'),'utf8');
  const current={games:[{...game,status:'final',homeScore:110,awayScore:100,observedAt:'2026-10-26T05:00:00Z'}],snapshots:[]};
  await recordSettlements(root,policy,current,'2026-10-26T05:00:00Z');
  assert.equal(await recordSettlements(root,policy,current,'2026-10-26T06:00:00Z'),0);
  let records=await readLedger(root);assert.equal(primaryForecasts(records)[0].forecast.homeProbability,.6);
  assert.equal(paperMetrics(records).primaryForecasts,1);assert.equal(paperMetrics(records).settled,1);
  assert.ok(Math.abs(paperMetrics(records).model.logLoss+Math.log(.6))<1e-12);
  current.games[0].homeScore=90;
  await recordSettlements(root,policy,current,'2026-10-27T05:00:00Z');
  records=await readLedger(root);assert.equal(records.length,4);assert.equal(paperMetrics(records).model.accuracy,0);
  assert.equal(await readFile(join(root,'data/paper/ledger/00000001.json'),'utf8'),before);
  current.games[0].scheduledStart='2026-10-26T23:00:00Z';
  await recordSettlements(root,policy,current,'2026-10-27T06:00:00Z');
  assert.equal(paperMetrics(await readLedger(root)).settled,0);
}));
async function fixture(root,{games=[game],quotes=quote(),nextCursor=null}={}) {
  await mkdir(join(root,'experiments'),{recursive:true});
  await writeFile(join(root,'experiments/forward-001.json'),JSON.stringify(policy));
  await mkdir(join(root,'data'),{recursive:true});
  await writeFile(join(root,'data/collection-index.json'),JSON.stringify({collections:[]}));
  const calls=[];
  const collector=async(provider,options)=>{
    calls.push({provider,options});
    const metadata={provider,id:randomUUID(),observedAt:now,nextCursor:provider==='balldontlie'?nextCursor:null,quota:{}};
    const normalized=provider==='balldontlie'?{games}:{quotes};
    const dir=join(root,'data/snapshots',provider);await mkdir(dir,{recursive:true});
    await writeFile(join(dir,metadata.id+'.json'),JSON.stringify({metadata,normalized}));return metadata;
  };
  return {options:{root,collector,loadBaseline:async()=>bundle,sleep:async()=>{},now:()=>now},calls};
}
test('capture and result-check flow persists provenance without retraining or duplicate forecasts',async()=>temporary(async root=>{
  const {options,calls}=await fixture(root);
  const first=await runPaperOperation('capture',options);
  assert.equal(first.forecasts,1);assert.equal(first.matchedMarkets,1);
  await runPaperOperation('capture',options);
  const b=await paperBoard(root);assert.equal(b.captures.length,2);assert.equal(b.metrics.primaryForecasts,1);assert.equal(b.recommendationsEnabled,false);
  assert.equal(JSON.stringify(b).includes('weights'),false);
  const records=await readLedger(root);assert.deepEqual(records[0].entry.games[0].forecast.featureVector,forecastGame(game,history,[game],model,config,policy,now).featureVector);
  const before=calls.filter(c=>c.provider==='oddsapi').length;
  await runPaperOperation('results',options);
  assert.equal(calls.filter(c=>c.provider==='oddsapi').length,before);
  assert.equal(calls[0].options.startDate,'2026-10-20');
  assert.equal((await readdir(join(root,'data/paper/ledger'))).length,3);
}));
test('partial pagination or future inputs cannot create a forecast; failure stays recorded',async()=>temporary(async root=>{
  const {options,calls}=await fixture(root,{nextCursor:1});
  await assert.rejects(runPaperOperation('capture',options),/checks failed/);
  assert.equal(calls.filter(c=>c.provider==='oddsapi').length,0);
  assert.equal((await readLedger(root))[0].entry.type,'operation_failed');
  assert.equal((await paperBoard(root)).available,false);
}));
test('frozen configuration integrity is checked before loading training data',async()=>temporary(async root=>{
  await mkdir(join(root,'experiments'),{recursive:true});await mkdir(join(root,'artifacts/baseline-001'),{recursive:true});
  await writeFile(join(root,'experiments/baseline-001.json'),'{}');
  await writeFile(join(root,'artifacts/baseline-001/registration.json'),JSON.stringify({configHash:hash('changed')}));
  await writeFile(join(root,'artifacts/baseline-001/model.json'),'{}');
  await assert.rejects(loadFrozenBaseline(root),/integrity mismatch/);
}));

test('forward-002 accepts the observed ten-minute offset but rejects late forecasts',async()=>{
  const amended=JSON.parse(await readFile(new URL('../experiments/forward-002.json',import.meta.url),'utf8'));
  const q=quote().map(q=>({...q,scheduledStart:'2026-10-25T23:10:00Z'}));
  assert.equal(matchMarket(game,q,policy,now).available,false);
  assert.equal(matchMarket(game,q,amended,now).available,true);
  const near='2026-10-25T22:50:00Z';
  assert.equal(forecastGame(game,history,[game],model,config,amended,near).available,false);
  assert.equal(forecastGame(game,history,[game],model,config,amended,now).available,true);
});
test('a policy amendment keeps cohorts separate and preserves earlier captures',async()=>temporary(async root=>{
  const {options}=await fixture(root);await runPaperOperation('capture',options);
  const before=await readFile(join(root,'data/paper/ledger/00000001.json'),'utf8');
  const amended=JSON.parse(await readFile(new URL('../experiments/forward-002.json',import.meta.url),'utf8'));
  await writeFile(join(root,'experiments/forward-002.json'),JSON.stringify(amended));
  await writeFile(join(root,'experiments/forward-active.json'),JSON.stringify({policyId:'forward-002'}));
  await runPaperOperation('capture',options);
  const b=await paperBoard(root);
  assert.equal(b.policyId,'forward-002');assert.equal(b.captures.length,2);assert.equal(b.metrics.primaryForecasts,1);
  assert.equal(await readFile(join(root,'data/paper/ledger/00000001.json'),'utf8'),before);
  amended.maxEventStartDifferenceSeconds=3600;
  await writeFile(join(root,'experiments/forward-002.json'),JSON.stringify(amended));
  await assert.rejects(runPaperOperation('capture',options),/checks failed/);
}));

test('recent results respect the frozen score lag and final-at-future-tipoff cannot settle',async()=>temporary(async root=>{
  const recent={...game,providerGameId:'recent',gameDate:'2026-10-24',status:'final',homeScore:110,awayScore:100};
  const a=forecastGame(game,history,[recent],model,config,policy,now);
  const b=forecastGame(game,history,[{...recent,homeScore:70}],model,config,policy,now);
  assert.deepEqual(a.featureVector,b.featureVector);
  await appendLedger(root,{type:'capture',id:'f',policyId:policy.id,createdAt:now,games:[{...game,forecast:{available:true,homeProbability:.6},market:{meanHomeNoVig:.55}}]});
  const tooEarly={games:[{...game,status:'final',homeScore:110,awayScore:100,observedAt:'2026-10-25T16:00:00Z'}],snapshots:[]};
  assert.equal(await recordSettlements(root,policy,tooEarly,'2026-10-25T16:00:00Z'),0);
  assert.equal(paperMetrics(await readLedger(root)).settled,0);
}));
