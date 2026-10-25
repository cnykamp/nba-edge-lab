const DAY=86400000;
const dayNumber=date=>Date.parse(date+'T00:00:00Z')/DAY;
const mean=xs=>xs.reduce((s,x)=>s+x,0)/Math.max(1,xs.length);
export const sigmoid=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);

export function buildFeatures(games, config) {
  const ordered=[...games].sort((a,b)=>a.gameDate.localeCompare(b.gameDate)||a.id.localeCompare(b.id));
  const teams=new Map(),pending=[];const rows=[];
  let released=0,currentSeason=null;
  const team=id=>{if(!teams.has(id))teams.set(id,{rating:config.elo.initial,margins:[],count:0,lastPlayed:null});return teams.get(id);};
  for(let i=0;i<ordered.length;) {
    const day=ordered[i].gameDate, dayN=dayNumber(day), batch=[];
    while(i<ordered.length&&ordered[i].gameDate===day)batch.push(ordered[i++]);
    while(released<pending.length&&dayNumber(pending[released].gameDate)+config.scoreAvailabilityLagCalendarDays<=dayN) {
      const g=pending[released++],home=team(g.homeTeamId),away=team(g.awayTeamId);
      const expected=sigmoid(Math.LN10*(home.rating-away.rating+config.elo.homeAdvantage)/400);
      const change=config.elo.k*((g.homeScore>g.awayScore?1:0)-expected);
      home.rating+=change;away.rating-=change;
      const margin=g.homeScore-g.awayScore;
      for(const [t,m] of [[home,margin],[away,-margin]]) {t.margins.push(m);if(t.margins.length>config.recentMarginWindow)t.margins.shift();t.count++;}
    }
    const season=batch[0].season;
    if(currentSeason!==null&&season!==currentSeason)for(const t of teams.values())t.rating=config.elo.initial+(t.rating-config.elo.initial)*config.elo.offseasonCarry;
    currentSeason=season;
    const seen=new Set();
    for(const g of batch) {
      if(seen.has(g.homeTeamId)||seen.has(g.awayTeamId))throw new Error('A team has multiple games on one provider date.');
      seen.add(g.homeTeamId);seen.add(g.awayTeamId);
      const home=team(g.homeTeamId),away=team(g.awayTeamId);
      const eligible=Math.min(home.count,away.count)>=config.minimumPastResultsPerTeam;
      const rest=t=>t.lastPlayed===null?config.restCapDays:Math.min(config.restCapDays,Math.max(0,dayN-t.lastPlayed));
      const x=[1,(home.rating-away.rating)/400,(mean(home.margins)-mean(away.margins))/10,(rest(home)-rest(away))/7];
      if(eligible)rows.push({id:g.id,season:g.season,gameDate:day,x,y:g.homeScore>g.awayScore?1:0,margin:g.homeScore-g.awayScore,eloProbability:sigmoid(Math.LN10*(home.rating-away.rating+config.elo.homeAdvantage)/400),latestEligibleScoreDate:new Date((dayN-config.scoreAvailabilityLagCalendarDays)*DAY).toISOString().slice(0,10)});
    }
    // Schedule history updates after the entire day's features; scores wait for the lag.
    for(const g of batch){team(g.homeTeamId).lastPlayed=dayN;team(g.awayTeamId).lastPlayed=dayN;pending.push(g);}
  }
  return rows;
}
export function fitLogistic(rows, settings) {
  if(!rows.length)throw new Error('No training rows');
  const weights=Array(rows[0].x.length).fill(0);
  let iterations=0,gradientMax=Infinity;
  for(;iterations<settings.maxIterations;iterations++) {
    const gradient=weights.map(()=>0);
    for(const row of rows){const error=sigmoid(dot(weights,row.x))-row.y;for(let j=0;j<weights.length;j++)gradient[j]+=error*row.x[j]/rows.length;}
    for(let j=1;j<weights.length;j++)gradient[j]+=settings.l2MeanPenalty*weights[j];
    gradientMax=Math.max(...gradient.map(Math.abs));
    if(gradientMax<settings.gradientTolerance)break;
    for(let j=0;j<weights.length;j++)weights[j]-=settings.learningRate*gradient[j];
  }
  if(!weights.every(Number.isFinite))throw new Error('Nonfinite model weights');
  return {weights,iterations,gradientMax};
}
export function solve(matrix, vector) {
  const a=matrix.map((row,i)=>[...row,vector[i]]),n=vector.length;
  for(let k=0;k<n;k++) {
    let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;
    if(Math.abs(a[pivot][k])<1e-12)throw new Error('Singular matrix');
    [a[pivot],a[k]]=[a[k],a[pivot]];
    const divisor=a[k][k];for(let j=k;j<=n;j++)a[k][j]/=divisor;
    for(let i=0;i<n;i++)if(i!==k){const factor=a[i][k];for(let j=k;j<=n;j++)a[i][j]-=factor*a[k][j];}
  }
  return a.map(row=>row[n]);
}
export function fitMargin(rows, settings) {
  if(!rows.length)throw new Error('No training rows');
  const size=rows[0].x.length,a=Array.from({length:size},()=>Array(size).fill(0)),b=Array(size).fill(0);
  for(const row of rows)for(let i=0;i<size;i++){b[i]+=row.x[i]*row.margin/rows.length;for(let j=0;j<size;j++)a[i][j]+=row.x[i]*row.x[j]/rows.length;}
  for(let i=1;i<size;i++)a[i][i]+=settings.l2MeanPenalty;
  return {weights:solve(a,b)};
}
export function probabilityMetrics(rows,predict,bounds=[0,.2,.4,.6,.8,1]) {
  if(!rows.length)throw new Error('No evaluation rows');
  let loss=0,brier=0,correct=0;
  const buckets=bounds.slice(0,-1).map((lower,i)=>({lower,upper:bounds[i+1],n:0,sumPrediction:0,wins:0}));
  for(const row of rows) {
    const raw=predict(row);if(!Number.isFinite(raw)||raw<0||raw>1)throw new Error('Invalid probability');
    const p=Math.max(1e-12,Math.min(1-1e-12,raw));
    loss-=row.y*Math.log(p)+(1-row.y)*Math.log(1-p);brier+=(p-row.y)**2;correct+=(p>=.5?1:0)===row.y?1:0;
    const bucket=buckets.find(b=>p>=b.lower&&p<b.upper);bucket.n++;bucket.sumPrediction+=p;bucket.wins+=row.y;
  }
  return {n:rows.length,logLoss:loss/rows.length,brier:brier/rows.length,accuracy:correct/rows.length,calibration:buckets.map(b=>({lower:b.lower,upper:b.upper,n:b.n,predicted:b.n?b.sumPrediction/b.n:null,observed:b.n?b.wins/b.n:null}))};
}
export function marginMetrics(rows,predict) {
  if(!rows.length)throw new Error('No evaluation rows');
  const errors=rows.map(r=>predict(r)-r.margin);
  if(!errors.every(Number.isFinite))throw new Error('Nonfinite margin');
  return {n:rows.length,mae:mean(errors.map(Math.abs)),rmse:Math.sqrt(mean(errors.map(e=>e*e)))};
}
