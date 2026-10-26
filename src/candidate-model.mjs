import {sigmoid,dot,solve,fitMargin,probabilityMetrics,marginMetrics} from './baseline.mjs';
const DAY=86400000;
const day=d=>Date.parse(d+'T00:00:00Z')/DAY;
export const FEATURE_NAMES=['Home intercept','Elo difference','Weighted recent margins','Rest difference','Back-to-back difference','Four-day congestion','Seven-day congestion','Opponent-adjusted margins'];
const average=(a)=>a.reduce((s,v)=>s+v,0)/Math.max(1,a.length);
// In live mode this rebuilds today's state from scores known now, not historical forecasts.
export function candidateRows(games,config,variant,{cutoff=null,audit=false}={}) {
  if(cutoff&&!Number.isFinite(Date.parse(cutoff)))throw new Error('Invalid cutoff');
  const ordered=[...games].filter(g=>!cutoff||(Number.isFinite(Date.parse(g.observedAt))&&Date.parse(g.observedAt)<=Date.parse(cutoff))).sort((a,b)=>a.gameDate.localeCompare(b.gameDate)||String(a.id).localeCompare(String(b.id)));
  if(new Set(ordered.map(g=>String(g.id))).size!==ordered.length)throw new Error('Duplicate game ID');
  const teams=new Map(),pending=[],rows=[];let released=0,season=null;
  const team=id=>{if(!teams.has(id))teams.set(id,{rating:1500,results:[],played:[]});return teams.get(id);};
  for(let i=0;i<ordered.length;) {
    const date=ordered[i].gameDate,n=day(date),batch=[];
    if(!Number.isFinite(n))throw new Error('Invalid date');
    while(i<ordered.length&&ordered[i].gameDate===date)batch.push(ordered[i++]);
    while(released<pending.length&&day(pending[released].gameDate)+(cutoff?1:config.historicalLagDays)<=n) {
      const g=pending[released++],h=team(g.homeTeamId),a=team(g.awayTeamId);
      const m=g.homeScore-g.awayScore,expected=sigmoid(Math.LN10*(h.rating-a.rating+config.elo.homeAdvantage)/400),change=config.elo.k*((m>0?1:0)-expected);
      h.rating+=change;a.rating-=change;
      for(const [t,margin,opponentRating,venue,opponent] of [[h,m,g.awayPregameRating,1,g.away],[a,-m,g.homePregameRating,-1,g.home]]) {
        t.results.push({id:g.id,date:g.gameDate,season:g.season,margin,opponent:opponent??'Unknown',venue:venue===1?'Home':'Away',opponentRating,adjustedMargin:margin+(opponentRating-1500)/25-3*venue,observedAt:g.observedAt??null,availability:cutoff?'Observed before this forward cutoff':'Historical date + three-day approximation'});
      }
    }
    if(season!==null&&season!==batch[0].season)for(const t of teams.values())t.rating=1500+(t.rating-1500)*config.elo.offseasonCarry;
    season=batch[0].season;
    const seen=new Set();
    for(const g of batch) {
      if(g.homeTeamId===g.awayTeamId||seen.has(g.homeTeamId)||seen.has(g.awayTeamId))throw new Error('Invalid or duplicate team/date');
      seen.add(g.homeTeamId);seen.add(g.awayTeamId);
      const h=team(g.homeTeamId),a=team(g.awayTeamId);
      const summary=t=>{
        const contributors=t.results.slice(-config.recentWindow).map((r,index,arr)=>({...r,weight:Math.pow(2,-(arr.length-1-index)/variant.halfLifeGames)*Math.pow(variant.priorSeasonWeight,Math.max(0,g.season-r.season))}));
        const denom=contributors.reduce((s,r)=>s+r.weight,0);
        const weighted=key=>denom?contributors.reduce((s,r)=>s+r.weight*r[key],0)/denom:0;
        const last=t.played.at(-1),rest=last==null?7:Math.min(7,n-last);
        return {elo:t.rating,rest,backToBack:rest===1?1:0,games4:t.played.filter(d=>d<n&&d>=n-4).length,games7:t.played.filter(d=>d<n&&d>=n-7).length,totalResults:t.results.length,currentSeasonResults:t.results.filter(r=>r.season===g.season).length,currentSeasonWindow:contributors.filter(r=>r.season===g.season).length,weightedMargin:weighted('margin'),adjustedMargin:weighted('adjustedMargin'),contributors};
      };
      const home=summary(h),away=summary(a);
      if(Math.min(h.results.length,a.results.length)>=config.minimumPastResultsPerTeam) {
        const x=[1,(h.rating-a.rating)/400,(home.weightedMargin-away.weightedMargin)/10,(home.rest-away.rest)/7,variant.context?home.backToBack-away.backToBack:0,variant.context?(home.games4-away.games4)/4:0,variant.context?(home.games7-away.games7)/7:0,variant.context?(home.adjustedMargin-away.adjustedMargin)/10:0];
        rows.push({id:g.id,season:g.season,gameDate:g.gameDate,x,y:g.homeScore>g.awayScore?1:0,margin:g.homeScore-g.awayScore,eloProbability:sigmoid(Math.LN10*(h.rating-a.rating+60)/400),...(audit?{audit:{home,away,mode:cutoff?'Observed before forward cutoff; prior dates only':'Retrospective three-day availability approximation',cutoff}}:{})});
      }
      // Same-day scores cannot change another game's features.
    }
    for(const g of batch) {
      const h=team(g.homeTeamId),a=team(g.awayTeamId);h.played.push(n);a.played.push(n);
      if(g.isTarget!==true&&[g.homeScore,g.awayScore].every(Number.isInteger)&&g.homeScore!==g.awayScore)pending.push({...g,homePregameRating:h.rating,awayPregameRating:a.rating});
    }
  }
  return rows;
}
function objective(rows,w,lambda) {
  return average(rows.map(r=>{const z=dot(w,r.x);return Math.max(z,0)+Math.log1p(Math.exp(-Math.abs(z)))-r.y*z;}))+lambda/2*w.slice(1).reduce((s,v)=>s+v*v,0);
}
export function fitNewton(rows,settings) {
  if(!rows.length)throw new Error('Empty fit');
  let weights=Array(rows[0].x.length).fill(0),gradientMax=Infinity,iterations=0;
  for(;iterations<settings.maxIterations;iterations++) {
    const n=weights.length,g=Array(n).fill(0),h=Array.from({length:n},()=>Array(n).fill(0));
    for(const r of rows){const p=sigmoid(dot(weights,r.x));for(let j=0;j<n;j++){g[j]+=(p-r.y)*r.x[j]/rows.length;for(let k=0;k<n;k++)h[j][k]+=p*(1-p)*r.x[j]*r.x[k]/rows.length;}}
    for(let j=1;j<n;j++){g[j]+=settings.l2MeanPenalty*weights[j];h[j][j]+=settings.l2MeanPenalty;}
    gradientMax=Math.max(...g.map(Math.abs));if(gradientMax<settings.gradientTolerance)break;
    const direction=solve(h,g),old=objective(rows,weights,settings.l2MeanPenalty);let step=1,accepted=false;
    for(let k=0;k<30;k++){const next=weights.map((w,j)=>w-step*direction[j]);if(objective(rows,next,settings.l2MeanPenalty)<=old-1e-4*step*dot(g,direction)){weights=next;accepted=true;break;}step/=2;}
    if(!accepted)throw new Error('Numerical solution failed line search');
  }
  if(gradientMax>=settings.gradientTolerance||!weights.every(Number.isFinite))throw new Error('Numerical solution failed convergence');
  return {weights,iterations,gradientMax,converged:true};
}
export const rawProbability=(model,x)=>sigmoid(dot(model.logistic.weights,x));
export const calibratedProbability=(model,x)=>sigmoid(dot(model.calibrator.weights,[1,dot(model.logistic.weights,x)]));
export function marginDistribution(model,x) {
  const expected=dot(model.margin.weights,x),counts=new Map();
  for(const residual of model.residuals){const m=Math.round(expected+residual);if(m!==0)counts.set(m,(counts.get(m)||0)+1);}
  const total=[...counts.values()].reduce((s,n)=>s+n,0);if(!total)throw new Error('Empty margin distribution');
  const points=[...counts].sort((a,b)=>a[0]-b[0]).map(([margin,n])=>({margin,probability:n/total}));
  const quantile=q=>{let c=0;for(const p of points){c+=p.probability;if(c+1e-12>=q)return p.margin;}return points.at(-1).margin;};
  return {expected,points,interval:{mass:.8,lower:quantile(.1),upper:quantile(.9),method:'Empirical past calibration-season residuals; rounded integer final margin; research only'}};
}
export function spreadProbabilities(distribution,homeLine) {
  if(!Number.isFinite(homeLine)||!Number.isInteger(homeLine*2))throw new Error('Invalid spread');
  let cover=0,push=0,loss=0;
  for(const {margin,probability} of distribution.points){const result=margin+homeLine;if(result>0)cover+=probability;else if(result===0)push+=probability;else loss+=probability;}
  return {homeLine,homeCover:cover,push,awayCover:loss};
}
export function fitCandidate(rows,fold,config) {
  const train=rows.filter(r=>fold.train.includes(r.season)),cal=rows.filter(r=>fold.calibrate.includes(r.season));
  const logistic=fitNewton(train,config.logistic),margin=fitMargin(train,config.marginRidge);
  const calibrator=fitNewton(cal.map(r=>({...r,x:[1,dot(logistic.weights,r.x)]})),config.calibration);
  return {logistic,margin,calibrator,residuals:cal.map(r=>r.margin-dot(margin.weights,r.x)),trainingRows:train.length,calibrationRows:cal.length};
}
export function evaluateCandidate(model,rows,config) {
  const distribution=rows.map(r=>({r,d:marginDistribution(model,r.x)}));
  const probability=rows.map(r=>({...r,x:[1,dot(model.logistic.weights,r.x)]}));
  return {raw:probabilityMetrics(rows,r=>rawProbability(model,r.x)),calibrated:probabilityMetrics(probability,r=>sigmoid(dot(model.calibrator.weights,r.x))),elo:probabilityMetrics(rows,r=>r.eloProbability),margin:marginMetrics(rows,r=>dot(model.margin.weights,r.x)),interval:{mass:.8,n:rows.length,coverage:average(distribution.map(({r,d})=>r.margin>=d.interval.lower&&r.margin<=d.interval.upper?1:0)),meanWidth:average(distribution.map(({d})=>d.interval.upper-d.interval.lower))},syntheticSpreads:config.distribution.lineGrid.map(line=>({line,n:rows.length,multiclassBrier:average(distribution.map(({r,d})=>{const p=spreadProbabilities(d,line),v=r.margin+line;return (p.homeCover-(v>0?1:0))**2+(p.push-(v===0?1:0))**2+(p.awayCover-(v<0?1:0))**2;})),observedPushRate:average(rows.map(r=>r.margin+line===0?1:0))}))};
}
