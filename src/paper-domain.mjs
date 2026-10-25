import {buildFeatures,sigmoid,dot,probabilityMetrics} from './baseline.mjs';
const time=t=>Date.parse(t);
export function easternDate(t) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
}
export const addDays=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export const canonical=(name,policy)=>(policy.teamAliases[name]??name).toLowerCase().trim().replace(/\s+/g,' ');
export function regularGame(g,policy) {
  return g.season===policy.season&&g.gameDate>=policy.regularSeason.start&&g.gameDate<=policy.regularSeason.end&&g.gameDate!==policy.regularSeason.cupFinalDate&&g.istStage!=='Championship'&&g.postseason===false&&!g.postponed&&!['preseason','playin','playoffs'].includes(g.seasonType)&&[g.homeTeamId,g.awayTeamId].every(n=>Number.isInteger(n)&&n>=1&&n<=30);
}
export function forecastGame(game,history,current,model,config,policy,cutoff) {
  if(!Number.isFinite(time(cutoff))||time(game.observedAt)>time(cutoff)||!Number.isFinite(time(game.observedAt)))throw new Error('Game is not known by cutoff.');
  if(game.status!=='scheduled'||!Number.isFinite(time(game.scheduledStart))||time(game.scheduledStart)<=time(cutoff)+(policy.minimumLeadSeconds??0)*1000)return {available:false,reason:'Not a scheduled game with sufficient pregame lead time'};
  if(!regularGame(game,policy))return {available:false,reason:'Outside supported regular-season scope'};
  const prior=current.filter(g=>regularGame(g,policy)&&g.gameDate<game.gameDate);
  if(prior.some(g=>[g.homeTeamId,g.awayTeamId].some(id=>[game.homeTeamId,game.awayTeamId].includes(id))&&g.status!=='final'))return {available:false,reason:'Earlier game status unresolved'};
  if(current.some(g=>!Number.isFinite(time(g.observedAt))||time(g.observedAt)>time(cutoff)))throw new Error('Future-dated input snapshot');
  const finals=prior.filter(g=>g.status==='final').map(g=>({id:g.providerGameId,season:g.season,gameDate:g.gameDate,homeTeamId:g.homeTeamId,awayTeamId:g.awayTeamId,homeScore:g.homeScore,awayScore:g.awayScore}));
  const placeholder={id:game.providerGameId,season:game.season,gameDate:game.gameDate,homeTeamId:game.homeTeamId,awayTeamId:game.awayTeamId,homeScore:1,awayScore:0};
  // The frozen builder computes the target before releasing that target's placeholder.
  const row=buildFeatures([...history,...finals,placeholder],config).find(r=>r.id===game.providerGameId);
  if(!row)return {available:false,reason:'Insufficient prior team history'};
  const probability=sigmoid(dot(model.logistic.weights,row.x)),margin=dot(model.margin.weights,row.x);
  if(![probability,margin].every(Number.isFinite)||probability<=0||probability>=1)throw new Error('Invalid model output');
  const labels=['Home-court intercept','Elo strength','Recent score margins','Rest difference'];
  const contributions=row.x.map((x,i)=>({factor:labels[i],homeLogOddsContribution:x*model.logistic.weights[i]}));
  const strongest=contributions.slice().sort((a,b)=>Math.abs(b.homeLogOddsContribution)-Math.abs(a.homeLogOddsContribution))[0];
  return {available:true,homeProbability:probability,awayProbability:1-probability,homeMargin:margin,featureVector:row.x,latestEligibleScoreDate:row.latestEligibleScoreDate,contributions,explanation:`Largest model contribution: ${strongest.factor.toLowerCase()} leans toward ${strongest.homeLogOddsContribution>=0?game.home:game.away}. Elo difference ${Math.round(row.x[1]*400)}; recent margin difference ${(row.x[2]*10).toFixed(1)} points; capped rest difference ${Math.round(row.x[3]*7)} days. No injuries or lineup inputs.`,uncertaintyIntervals:null};
}
const implied=odds=>odds>0?100/(odds+100):-odds/(-odds+100);
export function matchMarket(game,quotes,policy,cutoff) {
  const sameTeams=quotes.filter(q=>canonical(q.home,policy)===canonical(game.home,policy)&&canonical(q.away,policy)===canonical(game.away,policy));
  const candidates=sameTeams.filter(q=>Math.abs(time(q.scheduledStart)-time(game.scheduledStart))<=policy.maxEventStartDifferenceSeconds*1000);
  const ids=[...new Set(candidates.map(q=>q.providerGameId))];
  if(ids.length!==1)return {available:false,reason:ids.length?'Ambiguous odds event':'No matching odds event',books:[]};
  const valid=candidates.filter(q=>time(q.scheduledStart)>time(cutoff)&&time(q.observedAt)<=time(cutoff)&&time(q.sourceUpdatedAt)<=time(q.observedAt)&&time(cutoff)-time(q.observedAt)<=policy.maxSnapshotAgeSeconds*1000&&time(cutoff)-time(q.sourceUpdatedAt)<=policy.maxSourceQuoteAgeSeconds*1000);
  const books=[];
  for(const book of ['FanDuel','DraftKings','BetMGM']) {
    const rows=valid.filter(q=>q.book===book);
    const sides=rows.filter(q=>q.market==='Moneyline');
    const home=sides.filter(q=>canonical(q.selection,policy)===canonical(game.home,policy));
    const away=sides.filter(q=>canonical(q.selection,policy)===canonical(game.away,policy));
    let moneyline=null;
    if(sides.length===2&&home.length===1&&away.length===1&&[home[0],away[0]].every(q=>Number.isInteger(q.americanOdds)&&Math.abs(q.americanOdds)>=100)&&home[0].sourceUpdatedAt===away[0].sourceUpdatedAt){
      const h=implied(home[0].americanOdds),a=implied(away[0].americanOdds);
      moneyline={homeOdds:home[0].americanOdds,awayOdds:away[0].americanOdds,homeImplied:h,homeNoVig:h/(h+a),awayNoVig:a/(h+a),sourceUpdatedAt:home[0].sourceUpdatedAt,quoteIds:[home[0].quoteId,away[0].quoteId]};
    }
    const spread=rows.filter(q=>q.market==='Spread');
    const hs=spread.filter(q=>canonical(q.selection,policy)===canonical(game.home,policy)),as=spread.filter(q=>canonical(q.selection,policy)===canonical(game.away,policy));
    const spreads=spread.length===2&&hs.length===1&&as.length===1&&[hs[0],as[0]].every(q=>Number.isFinite(q.line)&&Number.isInteger(q.line*2)&&Number.isInteger(q.americanOdds)&&Math.abs(q.americanOdds)>=100)&&Math.abs(hs[0].line+as[0].line)<1e-9&&hs[0].sourceUpdatedAt===as[0].sourceUpdatedAt?{homeLine:hs[0].line,homeOdds:hs[0].americanOdds,awayLine:as[0].line,awayOdds:as[0].americanOdds,sourceUpdatedAt:hs[0].sourceUpdatedAt,quoteIds:[hs[0].quoteId,as[0].quoteId]}:null;
    if(moneyline||spreads)books.push({book,moneyline,spreads});
  }
  const ps=books.flatMap(b=>b.moneyline?[b.moneyline.homeNoVig]:[]);
  return {available:books.length>0,providerGameId:ids[0],reason:books.length?null:'No fresh complete two-sided market',books,meanHomeNoVig:ps.length?ps.reduce((s,p)=>s+p,0)/ps.length:null,geography:'US feed; Michigan equivalence unverified'};
}
export function primaryForecasts(records) {
  const first=new Map();
  for(const r of records)if(r.entry.type==='capture')for(const g of r.entry.games)if(g.forecast?.available&&!first.has(g.providerGameId)&&time(r.entry.createdAt)<time(g.scheduledStart))first.set(g.providerGameId,{...g,captureId:r.entry.id,forecastCreatedAt:r.entry.createdAt,captureHash:r.hash});
  return [...first.values()];
}
export function paperMetrics(records) {
  const primary=primaryForecasts(records),latest=new Map();
  for(const r of records)if(r.entry.type==='settlement')latest.set(r.entry.providerGameId,r.entry);
  const settled=primary.flatMap(g=>{const s=latest.get(g.providerGameId);return s?.status==='final'?[{...g,y:s.homeScore>s.awayScore?1:0}]:[];});
  const paired=settled.filter(g=>Number.isFinite(g.market?.meanHomeNoVig));
  const metric=(rows,predict)=>rows.length?(({n,logLoss,brier,accuracy})=>({n,logLoss,brier,accuracy}))(probabilityMetrics(rows,predict)):null;
  return {primaryForecasts:primary.length,settled:settled.length,pending:primary.length-settled.length,model:metric(settled,r=>r.forecast.homeProbability),pairedGames:paired.length,pairedModel:metric(paired,r=>r.forecast.homeProbability),pairedMarket:metric(paired,r=>r.market.meanHomeNoVig),bettingReturns:null,interpretation:'Early manual research sample; no betting qualification or profit inference'};
}
