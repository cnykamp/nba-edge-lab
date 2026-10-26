import {readFile,mkdir,open,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ROOT} from './config.mjs';
import {collect} from './collection.mjs';
import {CollectionError} from './providers.mjs';
import {hash,readLedger,appendLedger} from './paper-ledger.mjs';
import {loadFrozenBaseline,recordSettlements,paperBoard,runPaperOperation as legacyOperation} from './paper-engine.mjs';
import {easternDate,addDays,regularGame,forecastGame,matchMarket,paperMetrics} from './paper-domain.mjs';
import {loadCandidate} from './candidate-research.mjs';
import {candidateRows,rawProbability,calibratedProbability,marginDistribution,spreadProbabilities,FEATURE_NAMES} from './candidate-model.mjs';
import {dot} from './baseline.mjs';
import {availabilityAt} from './availability.mjs';
const readJson=async p=>JSON.parse(await readFile(p,'utf8'));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function readSnapshot(root,metadata,provider) {
  if(metadata.provider!==provider||!/^[a-f0-9-]{36}$/.test(metadata.id))throw new Error('Invalid collection reference');
  const text=await readFile(join(root,'data','snapshots',provider,metadata.id+'.json'),'utf8');
  const snapshot=JSON.parse(text);
  if(snapshot.metadata.id!==metadata.id||snapshot.metadata.observedAt!==metadata.observedAt)throw new Error('Snapshot metadata mismatch');
  return {...snapshot,fileHash:hash(text)};
}
async function currentGames(root,policy,date,{collector,sleep,environment,fetchImpl}) {
  let cursor=null;const visited=new Set(),snapshots=[],byId=new Map();
  const endDate=addDays(date,1);
  for(let page=0;page<policy.maxGamePages;page++) {
    if(visited.has(cursor))throw new Error('Game pagination loop');visited.add(cursor);
    const metadata=await collector('balldontlie',{root,season:policy.season,cursor,startDate:policy.regularSeason.start,endDate,environment,fetchImpl});
    const snapshot=await readSnapshot(root,metadata,'balldontlie');
    snapshots.push({id:metadata.id,sha256:snapshot.fileHash,observedAt:metadata.observedAt});
    for(const g of snapshot.normalized.games){
      if(g.season!==policy.season||g.gameDate<policy.regularSeason.start||g.gameDate>endDate)throw new Error('Current-season query returned an out-of-scope game');
      const existing=byId.get(g.providerGameId);
      if(existing)throw new Error('Duplicate game in page chain');
      byId.set(g.providerGameId,g);
    }
    cursor=metadata.nextCursor;
    if(cursor===null)return {games:[...byId.values()],snapshots,pages:snapshots.length};
    await sleep(policy.minimumGameRequestIntervalMs);
  }
  throw new Error('Current-season pagination exceeded the bound; no partial forecast permitted');
}
export function candidateForecast(game,frozen,current,candidate,policy,cutoff,records=[]) {
  const baseline=forecastGame(game,frozen.history,current,frozen.model,frozen.config,policy,cutoff);
  // Reuse strict status/identity/lead and unresolved-history checks, not old feature timing.
  if(!baseline.available)return {...baseline,baseline};
  const eligible=current.filter(g=>regularGame(g,policy)&&g.status==='final'&&g.gameDate<game.gameDate&&Date.parse(g.observedAt)<=Date.parse(cutoff)).map(g=>({id:g.providerGameId,season:g.season,gameDate:g.gameDate,homeTeamId:g.homeTeamId,awayTeamId:g.awayTeamId,home:g.home,away:g.away,homeScore:g.homeScore,awayScore:g.awayScore,observedAt:g.observedAt}));
  const target={id:game.providerGameId,season:game.season,gameDate:game.gameDate,homeTeamId:game.homeTeamId,awayTeamId:game.awayTeamId,homeScore:1,awayScore:0,observedAt:game.observedAt,isTarget:true};
  const history=frozen.history.map(g=>({...g,observedAt:frozen.seedObservedAt}));
  const rows=candidateRows([...history,...eligible,target],candidate.config,candidate.model.variant,{cutoff,audit:true}),row=rows.find(r=>r.id===game.providerGameId);
  if(!row)return {available:false,reason:'Insufficient candidate history',baseline};
  const distribution=marginDistribution(candidate.model,row.x),p=calibratedProbability(candidate.model,row.x);
  const factors=row.x.map((value,i)=>({factor:FEATURE_NAMES[i],homeLogOddsContribution:value*candidate.model.logistic.weights[i]}));
  const strongest=factors.reduce((a,b)=>Math.abs(a.homeLogOddsContribution)>Math.abs(b.homeLogOddsContribution)?a:b);
  const h=row.audit.home,a=row.audit.away;
  return {available:true,homeProbability:p,awayProbability:1-p,rawHomeProbability:rawProbability(candidate.model,row.x),homeMargin:distribution.expected,featureVector:row.x,audit:row.audit,baseline,contributions:factors,distribution,interval:distribution.interval,latestEligibleScoreDate:[...h.contributors,...a.contributors].map(r=>r.date).sort().at(-1),availability:availabilityAt(records,game,cutoff),explanation:`Largest uncalibrated model contribution: ${strongest.factor.toLowerCase()} leans toward ${strongest.homeLogOddsContribution>=0?game.home:game.away}. Current-season results: ${game.home} ${h.currentSeasonResults}, ${game.away} ${a.currentSeasonResults}. Previous seasons are downweighted, not discarded. Calibration adjusts the final probability; injuries and roster changes have no fitted impact.`};
}
export async function runCandidateOperation(mode,{root=ROOT,collector=collect,loadCandidateModel=loadCandidate,loadBaseline=loadFrozenBaseline,sleep=pause,environment=process.env,fetchImpl=fetch,now=()=>new Date().toISOString()}={}) {
  const active=await readJson(join(root,'experiments/forward-active.json'));
  if(active.policyId!=='forward-003')return legacyOperation(mode,{root,collector,sleep,environment,fetchImpl,now});
  if(!['capture','results'].includes(mode))throw new Error('Unsupported research action');
  const dir=join(root,'data/paper');await mkdir(dir,{recursive:true,mode:0o700});let lock;
  try{lock=await open(join(dir,'.operation-lock'),'wx',0o600);}catch{throw new CollectionError('PAPER_BUSY','A research operation may already be running.');}
  const id=randomUUID();
  try {
    const policyText=await readFile(join(root,'experiments/forward-003.json'),'utf8'),policy=JSON.parse(policyText),policyHash=hash(policyText);
    const sources=['src/candidate-engine.mjs','src/candidate-model.mjs','src/candidate-research.mjs','src/availability.mjs','src/paper-engine.mjs','src/paper-domain.mjs','src/paper-ledger.mjs','src/collection.mjs','src/providers.mjs'];
    const sourceHashes=[];for(const file of sources)sourceHashes.push({file,sha256:hash(await readFile(join(root,file),'utf8'))});
    const implementationHash=hash(JSON.stringify(sourceHashes)),records=await readLedger(root),first=records.find(r=>r.entry.type==='capture'&&r.entry.policyId===policy.id);
    if(first&&(first.entry.policyHash!==policyHash||first.entry.implementationHash!==implementationHash))throw new Error('Forward candidate policy or source changed');
    const candidate=mode==='capture'?await loadCandidateModel(root):null,frozen=mode==='capture'?await loadBaseline(root):null;
    if(candidate&&(candidate.registration.baselineModelHash!==frozen.modelHash||candidate.registration.datasetHash!==frozen.model.datasetHash||(first&&first.entry.modelHash!==candidate.modelHash)))throw new Error('Frozen model mismatch');
    const date=easternDate(now());if(date<policy.regularSeason.start||date>policy.regularSeason.end)throw new Error('Policy does not cover current date');
    const current=await currentGames(root,policy,date,{collector,sleep,environment,fetchImpl});let settledUpdates=0;
    for(const policyId of new Set([policy.id,...records.filter(r=>r.entry.type==='capture').map(r=>r.entry.policyId)])) {
      if(!/^forward-\d{3}$/.test(policyId))throw new Error('Invalid prior policy');
      const text=await readFile(join(root,'experiments',policyId+'.json'),'utf8');
      const capture=records.find(r=>r.entry.type==='capture'&&r.entry.policyId===policyId);
      if(capture&&capture.entry.policyHash!==hash(text))throw new Error('Prior policy changed');
      settledUpdates+=await recordSettlements(root,JSON.parse(text),current,now());
    }
    if(mode==='results'){await appendLedger(root,{type:'results_check',id,policyId:policy.id,createdAt:now(),settledUpdates,sourceSnapshots:current.snapshots});return {mode,settledUpdates};}
    const oddsMetadata=await collector('oddsapi',{root,environment,fetchImpl}),odds=await readSnapshot(root,oddsMetadata,'oddsapi'),cutoff=now();
    if(easternDate(cutoff)!==date)throw new Error('Date changed during capture');
    for(const s of [...current.snapshots,oddsMetadata])if(!Number.isFinite(Date.parse(s.observedAt))||Date.parse(s.observedAt)>Date.parse(cutoff)||Date.parse(cutoff)-Date.parse(s.observedAt)>policy.maxSnapshotAgeSeconds*1000)throw new Error('Stale or future snapshot');
    const index=await readJson(join(root,'data/collection-index.json'));
    const seedTimes=frozen.historySnapshotHashes.map(s=>index.collections.find(c=>c.id===s.id)?.observedAt);
    if(seedTimes.some(t=>!Number.isFinite(Date.parse(t))||Date.parse(t)>Date.parse(cutoff)))throw new Error('Historical seed not observed before cutoff');
    frozen.seedObservedAt=seedTimes.sort().at(-1);
    const quotes=odds.normalized.quotes.map((q,i)=>({...q,quoteId:oddsMetadata.id+':'+i}));
    const games=current.games.filter(g=>g.scheduledStart?easternDate(g.scheduledStart)===date:g.gameDate===date).sort((a,b)=>(a.scheduledStart??'').localeCompare(b.scheduledStart??'')||a.providerGameId.localeCompare(b.providerGameId)).map(g=>{
      const forecast=candidateForecast(g,frozen,current.games,candidate,policy,cutoff,records),market=matchMarket(g,quotes,policy,cutoff);
      const spreadForecasts=forecast.available&&market.available?market.books.filter(b=>b.spreads).map(b=>({book:b.book,...spreadProbabilities(forecast.distribution,b.spreads.homeLine)})):[];
      if(forecast.available)delete forecast.distribution;
      return {providerGameId:g.providerGameId,home:g.home,away:g.away,season:g.season,gameDate:g.gameDate,scheduledStart:g.scheduledStart,status:g.status,forecast,market,spreadForecasts};
    });
    const savedAt=now();for(const g of games)if(g.forecast.available&&Date.parse(g.scheduledStart)<=Date.parse(savedAt)+policy.minimumLeadSeconds*1000)g.forecast={available:false,reason:'Insufficient lead when saved'};
    const matched=new Set(games.map(g=>g.market.providerGameId).filter(Boolean)),unmatchedOddsEvents=[...new Set(quotes.filter(q=>easternDate(q.scheduledStart)===date&&!matched.has(q.providerGameId)).map(q=>q.providerGameId))];
    const saved=await appendLedger(root,{type:'capture',id,policyId:policy.id,policyHash,implementationHash,sourceHashes,createdAt:savedAt,inputCutoff:cutoff,date,kind:'manual',modelId:'candidate-002',modelHash:candidate.modelHash,configHash:candidate.model.configHash,baselineModelHash:frozen.modelHash,historySnapshotHashes:frozen.historySnapshotHashes,gameSnapshots:current.snapshots,oddsSnapshot:{id:oddsMetadata.id,sha256:odds.fileHash,observedAt:oddsMetadata.observedAt,quota:oddsMetadata.quota},games,unmatchedOddsEvents,selection:{enabled:false,reason:'Candidate research only; future validation and availability impact pending'},settledUpdates});
    return {mode,operationId:id,games:games.length,forecasts:games.filter(g=>g.forecast.available).length,matchedMarkets:games.filter(g=>g.market.available).length,ledgerHash:saved.hash};
  }catch(error){const message=error instanceof CollectionError?error.message:'Candidate operation stopped: setup, data, or integrity check failed. Existing records preserved.';try{await appendLedger(root,{type:'operation_failed',id,mode,createdAt:now(),message});}catch{}throw new CollectionError('CANDIDATE_CHECK_FAILED',message);}
  finally{await lock.close();await unlink(join(dir,'.operation-lock'));}
}
export async function candidateBoard(root=ROOT) {
  const board=await paperBoard(root);if(board.statusError)return board;
  try {
    const records=await readLedger(root),last=records.filter(r=>r.entry.type==='capture'&&r.entry.policyId===board.policyId).at(-1);
    if(last&&board.latest)board.latest.games=board.latest.games.map(g=>{const original=last.entry.games.find(o=>o.providerGameId===g.providerGameId);return {...g,forecast:original.forecast,spreadForecasts:original.spreadForecasts??[],currentAvailability:availabilityAt(records,g,new Date().toISOString())};});
    board.priorCohorts=[...new Set(records.filter(r=>r.entry.type==='capture'&&r.entry.policyId!==board.policyId).map(r=>r.entry.policyId))].map(policyId=>({policyId,metrics:paperMetrics(records.filter(r=>r.entry.policyId===policyId))}));
    const captures=records.filter(r=>r.entry.type==='capture'&&r.entry.policyId===board.policyId),primary=new Map();
    for(const r of captures)for(const g of r.entry.games)if(g.forecast.available&&!primary.has(g.providerGameId))primary.set(g.providerGameId,{...g,date:r.entry.date});
    board.baselineComparison=paperMetrics(records.filter(r=>r.entry.policyId===board.policyId).map(r=>r.entry.type==='capture'?{...r,entry:{...r.entry,games:r.entry.games.map(g=>({...g,forecast:g.forecast.baseline??{available:false}}))}}:r));
    const settlements=new Map();for(const r of records.filter(r=>r.entry.policyId===board.policyId&&r.entry.type==='settlement'))settlements.set(r.entry.providerGameId,r.entry);
    const evaluated=[...primary.values()].filter(g=>g.forecast.interval&&settlements.get(g.providerGameId)?.status==='final');
    board.forwardIntervals={n:evaluated.length,coverage:evaluated.length?evaluated.filter(g=>{const s=settlements.get(g.providerGameId),m=s.homeScore-s.awayScore;return m>=g.forecast.interval.lower&&m<=g.forecast.interval.upper;}).length/evaluated.length:null};
    board.reviewProgress={settled:board.metrics.settled,forecastDates:new Set([...primary.values()].map(g=>g.date)).size,minimumSettled:200,minimumDates:60};
    return board;
  }catch{return {available:false,statusError:true,recommendationsEnabled:false};}
}
