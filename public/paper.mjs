const $=id=>document.getElementById(id);
const dateTime=value=>new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value))+' ET';
const pct=p=>(p*100).toFixed(1)+'%';
const number=n=>(n>0?'+':'')+n;
function node(tag,text,className) {const e=document.createElement(tag);if(text!=null)e.textContent=text;if(className)e.className=className;return e;}
let polling=null,lastCompletion=null;
function renderMetrics(metrics) {
  $('paper-total').textContent=metrics.primaryForecasts;
  $('paper-settled').textContent=metrics.settled;
  $('paper-accuracy').textContent=metrics.model?pct(metrics.model.accuracy):'—';
  $('paper-paired').textContent=metrics.pairedGames;
  $('paper-performance').textContent=metrics.pairedGames?`Same ${metrics.pairedGames} settled games: model log loss ${metrics.pairedModel.logLoss.toFixed(4)}; market log loss ${metrics.pairedMarket.logLoss.toFixed(4)}. Lower is better. This early manual sample does not establish an advantage or profit.`:'Results appear after captured games finish and you check results. Model and market will be compared on the same settled games. No betting returns are measured.';
}
function renderGame(g) {
  const article=node('article',null,'card paper-game');
  article.append(node('p',g.scheduledStart?dateTime(g.scheduledStart):'Start time unavailable','eyebrow'),node('h3',`${g.away} at ${g.home}`));
  if(!g.forecast.available)article.append(node('p',`Forecast unavailable: ${g.forecast.reason}.`,'section-note'));
  else {
    const stats=node('div',null,'paper-probabilities');
    stats.append(node('div',`${g.home}: ${pct(g.forecast.homeProbability)}`),node('div',`${g.away}: ${pct(g.forecast.awayProbability)}`));article.append(stats);
    const margin=g.forecast.homeMargin;
    article.append(node('p',`Expected margin: ${margin>=0?g.home:g.away} by ${Math.abs(margin).toFixed(1)}. Home line from expected margin: ${number(Number((-margin).toFixed(1)))}. ${g.forecast.interval?'Research interval shown below.':'Cover probability and interval pending.'}`,'section-note'),node('p',g.forecast.explanation,'section-note'));
  }
  if(g.forecast.available&&g.forecast.audit)article.append(renderAudit(g));
  if(g.scheduledStart&&Date.parse(g.scheduledStart)<=Date.now())article.append(node('p','Game has started. These are the original saved pregame numbers.','paper-warning'));
  if(!g.market.available)article.append(node('p',`Market comparison unavailable: ${g.market.reason}.`,'section-note'));
  else {
    const wrap=node('div',null,'table-wrap'),table=node('table'),caption=node('caption',`Saved home-side prices for ${g.home}`,'sr-only'),head=node('thead'),tr=node('tr');
    for(const label of ['Book','ML home / away','Market home %¹','Model − market²','Spread home / away'])tr.append(node('th',label));head.append(tr);table.append(caption,head);
    const body=node('tbody');
    for(const b of g.market.books) {
      const row=node('tr'),m=b.moneyline,s=b.spreads;
      const gap=m&&g.forecast.available?(100*(g.forecast.homeProbability-m.homeNoVig)):null;
      for(const value of [b.book,m?`${number(m.homeOdds)} / ${number(m.awayOdds)}`:'—',m?pct(m.homeNoVig):'—',gap==null?'—':number(Number(gap.toFixed(1)))+' pp',s?`${number(s.homeLine)} (${number(s.homeOdds)}) / ${number(s.awayLine)} (${number(s.awayOdds)})`:'—'])row.append(node('td',value));
      body.append(row);
    }
    table.append(body);wrap.append(table);article.append(wrap,node('p','¹ Book margin removed using its two moneyline prices. ² Diagnostic difference, not a qualified edge. US feed; Michigan equivalence unverified. Prices are a saved snapshot.','section-note'));
  }
  if(g.settlement)article.append(node('p',g.settlement.status==='final'?`Final: ${g.home} ${g.settlement.homeScore}, ${g.away} ${g.settlement.awayScore}. Checked ${dateTime(g.settlement.observedAt)}.`:'Result needs review: game identity, timing, or status changed.','paper-result'));
  return article;
}
function renderAudit(g) {
  const f=g.forecast,box=node('div',null,'candidate-audit');
  if(f.baseline?.available)box.append(node('p',`Same-cutoff original baseline: home ${pct(f.baseline.homeProbability)}; candidate raw ${pct(f.rawHomeProbability)}, calibrated ${pct(f.homeProbability)}.`,'section-note'));
  if(f.interval)box.append(node('p',`Research 80% home-margin prediction interval: ${number(f.interval.lower)} to ${number(f.interval.upper)} points. From earlier calibration-season residuals; conditional coverage unproven.`,'paper-warning'));
  for(const p of g.spreadForecasts??[])box.append(node('p',`${p.book} home ${number(p.homeLine)}: home cover ${pct(p.homeCover)}, push ${pct(p.push)}, away cover ${pct(p.awayCover)}. Research distribution; no qualified edge.`,'section-note'));
  const av=f.availability;box.append(node('p',`Availability at forecast: ${av?.state??'unreviewed'} — ${av?.reason??'No review before cutoff'}.`,'paper-warning'));
  const current=g.currentAvailability;if(current?.id&&current.id!==av?.id)box.append(node('p',`Later review: ${current.state}, observed ${dateTime(current.observedAt)}. This was not an input to the saved forecast.`,'section-note'));
  const detail=node('details',null,'paper-history');detail.append(node('summary','Inspect contributing games and schedule inputs'));
  detail.append(node('p',f.audit.mode+'. Input cutoff '+dateTime(f.audit.cutoff)+'.','section-note'));
  for(const [side,name] of [['home',g.home],['away',g.away]]) {
    const t=f.audit[side];detail.append(node('h3',name),node('p',`${t.currentSeasonResults} current-season results overall; ${t.currentSeasonWindow} of ${t.contributors.length} in the recent window. Elo ${t.elo.toFixed(0)}, weighted margin ${t.weightedMargin.toFixed(1)}, opponent-adjusted ${t.adjustedMargin.toFixed(1)}. Rest ${t.rest} days (capped at 7), back-to-back ${t.backToBack?'yes':'no'}, ${t.games4} prior games in 4 days / ${t.games7} in 7 days.`,'section-note'));
    const wrap=node('div',null,'table-wrap'),table=node('table'),head=node('thead'),row=node('tr');
    for(const label of ['Game date / ID','Opponent / venue','Season start year','Margin','Weight','Observed by us'])row.append(node('th',label));head.append(row);table.append(head);const body=node('tbody');
    for(const r of t.contributors){const tr=node('tr');for(const value of [r.date+' / '+r.id,r.opponent+' / '+r.venue,r.season,number(r.margin),r.weight.toFixed(3),r.observedAt?dateTime(r.observedAt):'Historical approximation'])tr.append(node('td',value));body.append(tr);}table.append(body);wrap.append(table);detail.append(wrap);
  }
  box.append(detail);return box;
}
export async function loadPaper() {
  try {
    const response=await fetch('/api/paper-board',{cache:'no-store'});if(!response.ok)throw new Error();
    const board=await response.json();
    for(const id of ['paper-capture','paper-results'])$(id).disabled=Boolean(board.operation?.running)||Boolean(board.statusError);
    if(board.statusError){$('paper-message').textContent='Saved paper records could not be verified. Actions are locked to preserve them.';return;}
    const running=board.operation?.running;
    if(board.operation?.completedAt&&board.operation.completedAt!==lastCompletion){lastCompletion=board.operation.completedAt;window.dispatchEvent(new Event('paper-data-updated'));}
    $('paper-message').textContent=running?'Collecting and checking data… A full current-season check may take several minutes. You can leave this page open.':board.operation?.message??(board.lastOperation?.type==='operation_failed'?board.lastOperation.message:'Manual research only. Saving a board uses one odds request within the existing free-plan limits. Checking results requests game scores only.');
    $('paper-snapshot').textContent=board.latest?`Saved ${dateTime(board.latest.createdAt)} · ${board.latest.date} board · ${board.policyId} · ${board.integrity}. ${board.latest.unmatchedOddsEvents} unmatched odds events. Captures never replace earlier forecasts.`:'No daily board saved yet. Save your first board before tipoff.';
    const list=$('paper-games');list.replaceChildren();
    if(board.latest){for(const g of board.latest.games)list.append(renderGame(g));if(!board.latest.games.length)list.append(node('p','The saved game query returned no games on this Eastern date. This is not a verified no-edge day.','section-note'));}
    renderMetrics(board.metrics);
    window.dispatchEvent(new CustomEvent('candidate-board-loaded',{detail:board}));
    const history=$('paper-history');history.replaceChildren();
    for(const c of board.captures)history.append(node('li',`${dateTime(c.createdAt)} · ${c.policyId} · ${c.forecasts} forecasts · record ${c.id.slice(0,8)}`));
    if(running&&!polling)polling=setTimeout(()=>{polling=null;loadPaper();},2500);
  }catch{$('paper-message').textContent='Daily board unavailable. If you just updated the app, restart the local dashboard, then reload this page.';}
}
for(const [id,path] of [['paper-capture','/api/paper-capture'],['paper-results','/api/paper-results']])$(id).addEventListener('click',async()=>{
  $('paper-capture').disabled=true;$('paper-results').disabled=true;
  try{const res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-NBA-Research':'manual'},body:'{}'});if(!res.ok){const data=await res.json();throw new Error(data.message??'Unable to start research.');}await loadPaper();}
  catch(e){$('paper-message').textContent=e.message;$('paper-capture').disabled=false;$('paper-results').disabled=false;}
});
loadPaper();

window.addEventListener('availability-saved',()=>loadPaper());
