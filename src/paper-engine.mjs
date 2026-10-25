import {readFile,mkdir,open,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ROOT} from './config.mjs';
import {collect} from './collection.mjs';
import {CollectionError} from './providers.mjs';
import {loadResearchData} from './research-data.mjs';
import {hash,readLedger,appendLedger} from './paper-ledger.mjs';
import {easternDate,addDays,regularGame,forecastGame,matchMarket,primaryForecasts,paperMetrics,canonical} from './paper-domain.mjs';
const readJson=async p=>JSON.parse(await readFile(p,'utf8'));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function activePolicy(root) {
  let id='forward-001';
  try{id=(await readJson(join(root,'experiments','forward-active.json'))).policyId;}catch(e){if(e.code!=='ENOENT')throw e;}
  if(!/^forward-\d{3}$/.test(id))throw new Error('Invalid active policy ID');
  const text=await readFile(join(root,'experiments',id+'.json'),'utf8');
  const policy=JSON.parse(text);if(policy.id!==id)throw new Error('Policy identity mismatch');
  return {policy,policyHash:hash(text)};
}
export async function loadFrozenBaseline(root=ROOT) {
  const configText=await readFile(join(root,'experiments','baseline-001.json'),'utf8');
  const config=JSON.parse(configText),dir=join(root,'artifacts','baseline-001');
  const registration=await readJson(join(dir,'registration.json'));
  const modelText=await readFile(join(dir,'model.json'),'utf8'),model=JSON.parse(modelText);
  if(hash(configText)!==registration.configHash||model.configHash!==registration.configHash||model.datasetHash!==registration.datasetHash)throw new Error('Frozen model/config integrity mismatch');
  for(const source of registration.codeHashes) {
    if(!['src/baseline.mjs','src/research-data.mjs','scripts/research.mjs'].includes(source.file)||hash(await readFile(join(root,source.file),'utf8'))!==source.sha256)throw new Error('Frozen source integrity mismatch');
  }
  if(registration.codeHashes.length!==3||![model.logistic?.weights,model.margin?.weights].every(xs=>Array.isArray(xs)&&xs.length===4&&xs.every(Number.isFinite)))throw new Error('Invalid frozen model');
  const {games,manifest}=await loadResearchData(config,root);
  if(!manifest.passed||manifest.datasetHash!==registration.datasetHash||JSON.stringify(manifest.snapshotHashes)!==JSON.stringify(registration.snapshotHashes))throw new Error('Frozen historical data changed');
  return {model,config,history:games,historySnapshotHashes:manifest.snapshotHashes,modelHash:hash(modelText),configHash:registration.configHash};
}
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
export async function recordSettlements(root,policy,current,observedAt) {
  const records=(await readLedger(root)).filter(r=>r.entry.policyId===policy.id),primaries=primaryForecasts(records),latest=new Map();
  for(const r of records)if(r.entry.type==='settlement')latest.set(r.entry.providerGameId,r);
  let appended=0;
  for(const g of primaries) {
    const final=current.games.find(row=>row.providerGameId===g.providerGameId);
    if(!final||!Number.isFinite(Date.parse(final.observedAt))||Date.parse(final.observedAt)<=Math.max(Date.parse(g.forecastCreatedAt),Date.parse(g.scheduledStart))||Date.parse(final.observedAt)>Date.parse(observedAt))continue;
    const identity=canonical(final.home,policy)===canonical(g.home,policy)&&canonical(final.away,policy)===canonical(g.away,policy);
    const timing=Number.isFinite(Date.parse(final.scheduledStart))&&Math.abs(Date.parse(final.scheduledStart)-Date.parse(g.scheduledStart))<=policy.maxEventStartDifferenceSeconds*1000;
    let status;
    if(!identity||!timing||final.postponed||['postponed','canceled','suspended','abandoned'].includes(final.status))status='review_required';
    else if(final.status==='final'&&[final.homeScore,final.awayScore].every(n=>Number.isInteger(n)&&n>=0)&&final.homeScore!==final.awayScore)status='final';
    else continue;
    const previous=latest.get(g.providerGameId);
    const entry={type:'settlement',id:randomUUID(),policyId:policy.id,providerGameId:g.providerGameId,captureId:g.captureId,observedAt,status,homeScore:status==='final'?final.homeScore:null,awayScore:status==='final'?final.awayScore:null,sourceSnapshots:current.snapshots,previousSettlementHash:previous?.hash??null};
    if(previous&&['status','homeScore','awayScore'].every(key=>previous.entry[key]===entry[key]))continue;
    const saved=await appendLedger(root,entry);latest.set(g.providerGameId,saved);appended++;
  }
  return appended;
}
export async function runPaperOperation(mode,{root=ROOT,collector=collect,loadBaseline=loadFrozenBaseline,sleep=pause,environment=process.env,fetchImpl=fetch,now=()=>new Date().toISOString()}={}) {
  if(!['capture','results'].includes(mode))throw new Error('Unsupported paper operation');
  const directory=join(root,'data','paper');await mkdir(directory,{recursive:true,mode:0o700});
  const lockPath=join(directory,'.operation-lock');let lock;
  try{lock=await open(lockPath,'wx',0o600);}catch{throw new CollectionError('PAPER_BUSY','A paper operation may already be running. No extra request was sent.');}
  const operationId=randomUUID();
  try {
    const {policy,policyHash}=await activePolicy(root);
    const sourceHashes=[];
    for(const file of ['paper-engine.mjs','paper-domain.mjs','paper-ledger.mjs','collection.mjs','providers.mjs'])sourceHashes.push({file,sha256:hash(await readFile(new URL('./'+file,import.meta.url),'utf8'))});
    const implementationHash=hash(JSON.stringify(sourceHashes));
    const startedAt=now(),date=easternDate(startedAt);
    if(date<policy.regularSeason.start||date>policy.regularSeason.end)throw new Error('Forward policy does not cover the current season/date');
    const existing=await readLedger(root),firstCapture=existing.find(r=>r.entry.type==='capture'&&r.entry.policyId===policy.id);
    if(firstCapture&&firstCapture.entry.implementationHash!==implementationHash)throw new Error('Forward implementation changed after capture');
    if(firstCapture&&firstCapture.entry.policyHash!==policyHash)throw new Error('Forward policy changed after capture');
    // Check the model before consuming odds credits; no fitting occurs in this path.
    const frozen=mode==='capture'?await loadBaseline(root):null;
    if(firstCapture&&frozen&&firstCapture.entry.modelHash!==frozen.modelHash)throw new Error('Frozen model changed after first capture');
    const current=await currentGames(root,policy,date,{collector,sleep,environment,fetchImpl});
    const checkedAt=now();
    let settledUpdates=await recordSettlements(root,policy,current,checkedAt);
    for(const priorId of new Set(existing.filter(r=>r.entry.type==='capture').map(r=>r.entry.policyId))) {
      if(priorId===policy.id)continue;
      if(!/^forward-\d{3}$/.test(priorId))throw new Error('Invalid prior policy ID');
      const priorText=await readFile(join(root,'experiments',priorId+'.json'),'utf8');
      if(existing.find(r=>r.entry.type==='capture'&&r.entry.policyId===priorId).entry.policyHash!==hash(priorText))throw new Error('Prior policy changed');
      settledUpdates+=await recordSettlements(root,JSON.parse(priorText),current,checkedAt);
    }
    if(mode==='results') {
      await appendLedger(root,{type:'results_check',id:operationId,policyId:policy.id,policyHash,createdAt:checkedAt,settledUpdates,sourceSnapshots:current.snapshots});
      return {operationId,mode,settledUpdates};
    }
    const oddsMetadata=await collector('oddsapi',{root,environment,fetchImpl});
    const odds=await readSnapshot(root,oddsMetadata,'oddsapi');
    const createdAt=now();
    if(easternDate(createdAt)!==date)throw new Error('Eastern date changed during capture; capture again for the new date');
    for(const s of [...current.snapshots,{observedAt:oddsMetadata.observedAt}])if(!Number.isFinite(Date.parse(s.observedAt))||Date.parse(s.observedAt)>Date.parse(createdAt)||Date.parse(createdAt)-Date.parse(s.observedAt)>policy.maxSnapshotAgeSeconds*1000)throw new Error('Input snapshot is future-dated or too old');
    const index=await readJson(join(root,'data','collection-index.json'));
    if(index.collections.some(c=>frozen.historySnapshotHashes.some(s=>s.id===c.id)&&Date.parse(c.observedAt)>Date.parse(createdAt)))throw new Error('Historical seed was observed after cutoff');
    const quotes=odds.normalized.quotes.map((q,i)=>({...q,quoteId:oddsMetadata.id+':'+i}));
    const games=current.games.filter(g=>g.scheduledStart?easternDate(g.scheduledStart)===date:g.gameDate===date).sort((a,b)=>(a.scheduledStart??'').localeCompare(b.scheduledStart??'')||a.providerGameId.localeCompare(b.providerGameId)).map(g=>({
      providerGameId:g.providerGameId,gameDate:g.gameDate,season:g.season,home:g.home,away:g.away,scheduledStart:g.scheduledStart,status:g.status,
      forecast:forecastGame(g,frozen.history,current.games,frozen.model,frozen.config,policy,createdAt),market:matchMarket(g,quotes,policy,createdAt),
    }));
    const matchedIds=new Set(games.map(g=>g.market.providerGameId).filter(Boolean));
    const unmatchedOddsEvents=[...new Set(quotes.filter(q=>easternDate(q.scheduledStart)===date&&!matchedIds.has(q.providerGameId)).map(q=>q.providerGameId))];
    const savedAt=now();
    for(const g of games)if(g.forecast.available&&Date.parse(g.scheduledStart)<=Date.parse(savedAt)+(policy.minimumLeadSeconds??0)*1000)g.forecast={available:false,reason:'Insufficient pregame lead before the capture could be saved'};
    const record=await appendLedger(root,{type:'capture',id:operationId,policyId:policy.id,policyHash,implementationHash,sourceHashes,createdAt:savedAt,inputCutoff:createdAt,date,kind:'manual',modelId:'baseline-001',modelHash:frozen.modelHash,configHash:frozen.configHash,historySnapshotHashes:frozen.historySnapshotHashes,gameSnapshots:current.snapshots,oddsSnapshot:{id:oddsMetadata.id,sha256:odds.fileHash,observedAt:oddsMetadata.observedAt,quota:oddsMetadata.quota},games,unmatchedOddsEvents,selection:{enabled:false,reason:'Research-only model; qualification and intervals pending'},settledUpdates});
    return {operationId,mode,date,games:games.length,forecasts:games.filter(g=>g.forecast.available).length,matchedMarkets:games.filter(g=>g.market.available).length,unmatchedOddsEvents:unmatchedOddsEvents.length,ledgerHash:record.hash,settledUpdates};
  }catch(error){
    const message=error instanceof CollectionError?error.message:'Paper operation stopped because data, integrity, or setup checks failed. Existing records were preserved.';
    try{await appendLedger(root,{type:'operation_failed',id:operationId,mode,createdAt:now(),code:error instanceof CollectionError?error.code:'PAPER_CHECK_FAILED',message});}catch{}
    // Do not forward arbitrary provider, filesystem, or credential-bearing exception text.
    throw new CollectionError(error instanceof CollectionError?error.code:'PAPER_CHECK_FAILED',message);
  }finally{await lock.close();await unlink(lockPath);}
}
export async function paperBoard(root=ROOT) {
  try {
    const {policy}=await activePolicy(root);
    const allRecords=await readLedger(root),records=allRecords.filter(r=>r.entry.policyId===policy.id),captures=records.filter(r=>r.entry.type==='capture'),last=captures.at(-1);
    const settlements=new Map();for(const r of records)if(r.entry.type==='settlement')settlements.set(r.entry.providerGameId,r.entry);
    const latest=last?{id:last.entry.id,createdAt:last.entry.createdAt,date:last.entry.date,kind:last.entry.kind,games:last.entry.games.map(g=>({providerGameId:g.providerGameId,home:g.home,away:g.away,scheduledStart:g.scheduledStart,status:g.status,forecast:g.forecast.available?{available:true,homeProbability:g.forecast.homeProbability,awayProbability:g.forecast.awayProbability,homeMargin:g.forecast.homeMargin,explanation:g.forecast.explanation,latestEligibleScoreDate:g.forecast.latestEligibleScoreDate}:{available:false,reason:g.forecast.reason},market:g.market,settlement:settlements.get(g.providerGameId)?(({status,homeScore,awayScore,observedAt})=>({status,homeScore,awayScore,observedAt}))(settlements.get(g.providerGameId)):null})),unmatchedOddsEvents:last.entry.unmatchedOddsEvents.length}:null;
    return {available:Boolean(last),policyId:policy.id,integrity:'Verified local hash chain',latest,metrics:paperMetrics(records),captures:allRecords.filter(r=>r.entry.type==='capture').slice(-10).reverse().map(r=>({policyId:r.entry.policyId,id:r.entry.id,createdAt:r.entry.createdAt,date:r.entry.date,forecasts:r.entry.games.filter(g=>g.forecast.available).length})),lastOperation:allRecords.at(-1)?(({type,createdAt,message,mode})=>({type,createdAt,message,mode}))(allRecords.at(-1).entry):null,recommendationsEnabled:false};
  }catch{return {available:false,statusError:true,integrity:'Could not verify saved paper records',recommendationsEnabled:false};}
}
