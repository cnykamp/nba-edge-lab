import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {candidateRows,fitNewton,fitCandidate,marginDistribution,spreadProbabilities,calibratedProbability} from '../src/candidate-model.mjs';
import {validateReview,availabilityAt,saveAvailability} from '../src/availability.mjs';
import {appendLedger,readLedger} from '../src/paper-ledger.mjs';
const config=JSON.parse(await readFile(new URL('../experiments/candidate-002.json',import.meta.url),'utf8'));
const v=config.variants[1];
const games=Array.from({length:45},(_,i)=>({id:String(i),season:2023,gameDate:new Date(Date.UTC(2023,0,1+i*2)).toISOString().slice(0,10),homeTeamId:i%2?2:1,awayTeamId:i%2?1:2,homeScore:100+(i%7),awayScore:95+(i%11),observedAt:'2026-01-01T00:00:00Z'})).filter(g=>g.homeScore!==g.awayScore);
test('candidate never uses target/future scores; historical lag and same-day batching persist',()=>{
 const first=candidateRows(games,config,v,{audit:true});const target=games.at(-1),original=first.find(r=>r.id===target.id);
 const changed=candidateRows(games.map(g=>g.id===target.id?{...g,homeScore:200,awayScore:1}:g),config,v,{audit:true}).find(r=>r.id===target.id);
 assert.deepEqual(changed.x,original.x);assert.ok(original.audit.home.contributors.every(g=>Date.parse(g.date)<=Date.parse(target.gameDate)-3*86400000));
 assert.throws(()=>candidateRows([...games,games[0]],config,v),/Duplicate game/);
});
test('forward accepts prior-date observed finals, excludes future observations and same-date results',()=>{
 const target={id:'target',season:2023,gameDate:'2023-04-02',homeTeamId:1,awayTeamId:2,homeScore:1,awayScore:0,isTarget:true,observedAt:'2026-01-02T00:00:00Z'};
 const recent={...games[0],id:'recent',gameDate:'2023-04-01',homeScore:130,awayScore:80,observedAt:'2026-01-02T00:00:00Z'};
 const cutoff='2026-01-02T01:00:00Z';
 const row=candidateRows([...games,recent,target],config,v,{cutoff,audit:true}).at(-1);
 assert.ok(row.audit.home.contributors.some(g=>g.id==='recent'));
 const future=candidateRows([...games,{...recent,observedAt:'2026-01-03T00:00:00Z'},target],config,v,{cutoff,audit:true}).at(-1);
 assert.ok(!future.audit.home.contributors.some(g=>g.id==='recent'));
 const same={...recent,id:'same',homeTeamId:3,awayTeamId:4,gameDate:target.gameDate};
 assert.deepEqual(candidateRows([...games,recent,same,target],config,v,{cutoff,audit:true}).find(r=>r.id==='target').x,row.x);
});
test('offseason weighting retains prior and exposes exact season mix; context is causal schedule',()=>{
 const prior=games.slice(0,-1),target={...games.at(-1),id:'next',season:2024,gameDate:'2024-10-20'};
 const row=candidateRows([...prior,target],config,v,{audit:true}).at(-1);
 assert.equal(row.audit.home.currentSeasonResults,0);assert.equal(row.audit.home.currentSeasonWindow,0);assert.equal(row.audit.home.contributors.length,20);
 assert.ok(row.audit.home.contributors.every(r=>r.weight<=.25));assert.equal(row.audit.home.games7,0);
 const slow=candidateRows([...prior,target],config,config.variants[2],{audit:true}).at(-1);assert.notEqual(slow.audit.home.weightedMargin,row.audit.home.weightedMargin);
});
test('Newton solves penalized likelihood and explicit nonconvergence fails',()=>{
 const rows=Array.from({length:100},(_,i)=>({x:[1,(i-50)/20],y:i%4===0?1:0}));
 const fit=fitNewton(rows,config.logistic);assert.equal(fit.converged,true);assert.ok(fit.gradientMax<1e-8);
 assert.throws(()=>fitNewton(rows,{...config.logistic,maxIterations:0}),/convergence/);
});
test('calibrator and residual distribution never see evaluation outcomes',()=>{
 const rows=Array.from({length:180},(_,i)=>({season:2021+Math.floor(i/60),x:[1,(i%9-4)/4,0,0,0,0,0,0],y:i%3===0?1:0,margin:i%7-3}));
 const fold={train:[2021],calibrate:[2022],evaluate:[2023]},a=fitCandidate(rows,fold,config),b=fitCandidate(rows.map(r=>r.season===2023?{...r,y:1-r.y,margin:1000}:r),fold,config);
 assert.deepEqual(a,b);assert.ok(calibratedProbability(a,rows[0].x)>0);
 const d=marginDistribution(a,rows[0].x);assert.ok(d.points.every(p=>p.margin!==0));assert.ok(d.interval.lower<=d.interval.upper);
 for(const line of [-5,-2.5,0,3,5]){const p=spreadProbabilities(d,line);assert.ok(Math.abs(p.homeCover+p.push+p.awayCover-1)<1e-12);if(!Number.isInteger(line))assert.equal(p.push,0);}
 const integer=spreadProbabilities({points:[{margin:3,probability:.3},{margin:5,probability:.7}]},-3);assert.equal(integer.push,.3);assert.equal(integer.homeCover,.7);
});
const game={providerGameId:'g',home:'Home',away:'Away'};
const input={providerGameId:'g',sourceUrl:'https://official.nba.com/nba-injury-report-2026-27-season/',publishedAt:'2026-10-26T10:00:00Z',reviewState:'both_teams_reviewed',players:[{team:'Home',player:'Example',status:'Questionable',reason:'test'}],notes:''};
test('manual reviews cannot backdate observation or imply healthy/unavailable players; stale and future guards',()=>{
 const observed='2026-10-26T11:00:00Z',review=validateReview(input,game,observed),records=[{entry:review,hash:'hash'}];
 assert.equal(availabilityAt(records,game,'2026-10-26T10:30:00Z').state,'unreviewed');
 assert.equal(availabilityAt(records,game,observed).state,'unresolved');assert.equal(availabilityAt(records,game,'2026-10-26T18:00:00Z').state,'stale');
 assert.throws(()=>validateReview({...input,sourceUrl:'https://evil.example/'},game,observed));
 assert.throws(()=>validateReview({...input,publishedAt:'2027-01-01T00:00:00Z'},game,observed));
 assert.throws(()=>validateReview({...input,players:[{team:'Other',player:'Example',status:'Out'}]},game,observed));
});
test('availability persistence appends corrections and leaves the original capture untouched',async()=>{
 const root=await mkdtemp(join(tmpdir(),'nba-availability-'));
 try {await appendLedger(root,{type:'capture',games:[game]});const original=(await readLedger(root))[0].hash;
 await saveAvailability(input,{root,now:()=> '2026-10-26T11:00:00Z'});
 await saveAvailability({...input,reviewState:'incomplete',players:[]},{root,now:()=> '2026-10-26T12:00:00Z'});
 const records=await readLedger(root);assert.equal(records.length,3);assert.equal(records[0].hash,original);assert.equal(availabilityAt(records,game,'2026-10-26T12:01:00Z').state,'incomplete');
 }finally{await rm(root,{recursive:true,force:true});}
});

test('candidate capture persists fresh score audit, shadow baseline and spreads; independent cohort and result-only no odds',async()=>{
 const {mkdir,writeFile,copyFile}=await import('node:fs/promises');const {randomUUID}=await import('node:crypto');
 const {runCandidateOperation,candidateBoard}=await import('../src/candidate-engine.mjs');
 const root=await mkdtemp(join(tmpdir(),'nba-candidate-operation-'));
 try {
  const now='2026-10-26T15:00:00Z',policy=JSON.parse(await readFile(new URL('../experiments/forward-003.json',import.meta.url),'utf8'));
  await mkdir(join(root,'experiments'),{recursive:true});await mkdir(join(root,'src'),{recursive:true});await mkdir(join(root,'data'),{recursive:true});
  await writeFile(join(root,'experiments/forward-active.json'),JSON.stringify({policyId:'forward-003'}));
  await writeFile(join(root,'experiments/forward-003.json'),JSON.stringify(policy));
  for(const name of ['candidate-engine','candidate-model','candidate-research','availability','paper-engine','paper-domain','paper-ledger','collection','providers'])await copyFile(new URL('../src/'+name+'.mjs',import.meta.url),join(root,'src',name+'.mjs'));
  await writeFile(join(root,'data/collection-index.json'),JSON.stringify({collections:[{id:'seed',observedAt:'2026-10-24T12:00:00Z'}]}));
  const g={providerGameId:'target',season:2026,gameDate:'2026-10-26',scheduledStart:'2026-10-26T23:00:00Z',home:'Home',away:'Away',homeTeamId:1,awayTeamId:2,status:'scheduled',postseason:false,postponed:false,observedAt:now};
  const recent={...g,providerGameId:'fresh',gameDate:'2026-10-25',scheduledStart:'2026-10-25T23:00:00Z',status:'final',homeScore:130,awayScore:80};
  const history=games.map(h=>({...h,season:2025}));
  const frozen={history,historySnapshotHashes:[{id:'seed',sha256:'fixture'}],modelHash:'baseline',config:JSON.parse(await readFile(new URL('../experiments/baseline-001.json',import.meta.url),'utf8')),model:{datasetHash:'dataset',logistic:{weights:[.1,.1,.1,.1]},margin:{weights:[1,1,1,1]}}};
  const candidate={config,registration:{baselineModelHash:'baseline',datasetHash:'dataset'},modelHash:'candidate',model:{configHash:'candidate-config',variant:v,logistic:{weights:[.1,.1,.1,.1,.1,.1,.1,.1]},calibrator:{weights:[0,1]},margin:{weights:[1,1,1,1,1,1,1,1]},residuals:[-10,-5,0,5,10]}};
  let calls=[],time=now,final=false;
  const collector=async provider=>{calls.push(provider);const metadata={provider,id:randomUUID(),observedAt:time,nextCursor:null,quota:{}};const rows=final?[{...g,status:'final',homeScore:110,awayScore:100,observedAt:time},recent]:[g,recent];const quotes=['Moneyline','Spread'].flatMap(m=>['Home','Away'].map((selection,i)=>({providerGameId:'odds',home:g.home,away:g.away,scheduledStart:g.scheduledStart,book:'FanDuel',market:m,selection,line:m==='Spread'?(i?3:-3):null,americanOdds:i?120:-140,sourceUpdatedAt:time,observedAt:time})));await mkdir(join(root,'data/snapshots',provider),{recursive:true});await writeFile(join(root,'data/snapshots',provider,metadata.id+'.json'),JSON.stringify({metadata,normalized:provider==='balldontlie'?{games:rows}:{quotes}}));return metadata;};
  const options={root,collector,loadBaseline:async()=>frozen,loadCandidateModel:async()=>candidate,sleep:async()=>{},now:()=>time};
  const capture=await runCandidateOperation('capture',options);assert.equal(capture.forecasts,1);assert.equal(capture.matchedMarkets,1);
  const saved=(await readLedger(root))[0];const f=saved.entry.games[0].forecast;
  assert.ok(f.audit.home.contributors.some(r=>r.id==='fresh'));assert.ok(f.audit.home.contributors.every(r=>r.observedAt<=now));assert.equal(f.baseline.available,true);assert.equal(saved.entry.games[0].spreadForecasts.length,1);assert.equal(f.availability.state,'unreviewed');
  await runCandidateOperation('capture',options);assert.equal((await candidateBoard(root)).metrics.primaryForecasts,1);
  time='2026-10-27T05:00:00Z';final=true;const oddsCalls=calls.filter(x=>x==='oddsapi').length;await runCandidateOperation('results',options);assert.equal(calls.filter(x=>x==='oddsapi').length,oddsCalls);
  const board=await candidateBoard(root);assert.equal(board.metrics.settled,1);assert.equal(board.baselineComparison.settled,1);assert.equal(board.forwardIntervals.n,1);assert.equal((await readLedger(root))[0].hash,saved.hash);
  await writeFile(join(root,'src/candidate-model.mjs'),'changed');await assert.rejects(runCandidateOperation('capture',options),/integrity/);
 }finally{await rm(root,{recursive:true,force:true});}
});
