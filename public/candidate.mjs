const $=id=>document.getElementById(id);
const pct=p=>(p*100).toFixed(1)+'%';
const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
let board=null;
async function loadCandidate() {
 try {
  const response=await fetch('/api/candidate-status',{cache:'no-store'});if(!response.ok)throw new Error();const r=await response.json();
  if(!r.available){$('candidate-summary').textContent=r.statusError?'Candidate integrity check failed. Saved forecasts are preserved; research is unavailable.':'Candidate is preregistered but not fitted. The original model remains separate.';return;}
  $('candidate-summary').textContent=`Primary: ${r.primaryVariant}, fixed before fitting. ${r.primary.trainingRows} fitting games, ${r.primary.calibrationRows} separate calibration games. All six registered fits converged; no candidate has been promoted.`;
  const tbody=$('candidate-metrics');tbody.replaceChildren();const details=$('candidate-detail');details.replaceChildren();
  for(const e of r.experiments)for(const f of e.folds) {
   const tr=node('tr','');for(const value of [e.variant.id+' / '+f.fold.evaluate.join(', '),f.raw.logLoss.toFixed(4),f.calibrated.logLoss.toFixed(4),f.originalBaseline.logLoss.toFixed(4)+(f.fold.evaluate.includes(2023)?' *':''),f.margin.mae.toFixed(2),pct(f.interval.coverage)+' · n='+f.interval.n])tr.append(node('td',value));tbody.append(tr);
   if(e.variant.id===r.primaryVariant){const detail=node('details','');detail.className='paper-history';detail.append(node('summary',`Primary diagnostics · ${f.fold.evaluate.join(', ')}`),node('p',`Calibration: ${f.fold.calibrate.join(', ')} only. Interval mean width: ${f.interval.meanWidth.toFixed(1)} points. ${f.baselineComparisonNote}`));const ul=node('ul','');for(const b of f.calibrated.calibration)ul.append(node('li',`${pct(b.lower)}–${pct(b.upper)}: n=${b.n}, predicted ${b.predicted==null?'—':pct(b.predicted)}, observed ${b.observed==null?'—':pct(b.observed)}.`));detail.append(ul);const spreads=node('p',f.syntheticSpreads.map(s=>`Home ${s.line}: push observed ${pct(s.observedPushRate)}, three-outcome Brier ${s.multiclassBrier.toFixed(3)}`).join(' · '));detail.append(spreads);details.append(detail);}
  }
 }catch{$('candidate-summary').textContent='Candidate report unavailable. Restart the updated local dashboard if needed.';}
}
function renderReview() {
 const target=$('availability-record'),g=board?.latest?.games.find(g=>g.providerGameId===$('availability-game').value),r=g?.currentAvailability;target.replaceChildren();
 if(!r?.id){target.append(node('p','No saved report review for this matchup. Availability is unreviewed.'));return;}
 const time=value=>new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',dateStyle:'medium',timeStyle:'short'}).format(new Date(value))+' ET';
 target.append(node('h3',`Latest recorded review: ${r.state}`),node('p',`${r.reason}. Published ${time(r.publishedAt)}; observed ${time(r.observedAt)}. ${r.source}.`));
 const link=node('a','Open recorded official source ↗');link.href=r.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';link.className='setup-link';target.append(link);
 const list=node('ul','');for(const p of r.players)list.append(node('li',`${p.team} · ${p.player}: ${p.status}${p.reason?' — '+p.reason:''}`));target.append(list);
 if(!r.players.length)target.append(node('p','No player rows entered. This does not establish a healthy roster.'));
 if(r.notes)target.append(node('p',r.notes));
}
$('availability-game').addEventListener('change',renderReview);
window.addEventListener('candidate-board-loaded' ,event=>{
 board=event.detail;const p=board.reviewProgress,b=board.baselineComparison?.model;
 $('candidate-forward').textContent=p?`Future review progress: ${p.settled}/${p.minimumSettled} settled games, ${p.forecastDates}/${p.minimumDates} forecast dates. ${b?'Original baseline log loss on this cohort: '+b.logLoss.toFixed(4)+'. ':''}${board.forwardIntervals?.n?'Forward interval coverage '+pct(board.forwardIntervals.coverage)+' on '+board.forwardIntervals.n+' games. ':''}Recommendations remain locked. Prior cohorts: ${(board.priorCohorts??[]).map(c=>c.policyId+' '+c.metrics.settled+' settled (kept separate)').join('; ')||'none'}.`:'No candidate forward observations yet.';
 const select=$('availability-game'),previous=select.value;select.replaceChildren();
 for(const g of board.latest?.games??[]){const option=node('option',`${g.away} at ${g.home}`);option.value=g.providerGameId;select.append(option);}if([...select.options].some(o=>o.value===previous))select.value=previous;
 $('availability-save').disabled=!select.options.length||Boolean(board.operation?.running);
 renderReview();
 if(select.options.length&&$('availability-message').textContent.startsWith('Save a daily board'))$('availability-message').textContent='No report review is assumed. Check the official source and save your observation.';
});
$('availability-form').addEventListener('submit',async event=>{
 event.preventDefault();const form=event.currentTarget,button=$('availability-save');button.disabled=true;
 try {
  const f=Object.fromEntries(new FormData(form)),g=board.latest.games.find(g=>g.providerGameId===f.providerGameId);
  const players=f.players.split('\n').filter(line=>line.trim()).map(line=>{const parts=line.split('|').map(s=>s.trim());if(parts.length<3||parts.length>4||!['H','A'].includes(parts[0].toUpperCase()))throw new Error('Use H or A | Player | Status | Reason for each row.');return {team:parts[0].toUpperCase()==='H'?g.home:g.away,player:parts[1],status:parts[2],reason:parts[3]??''};});
  const publishedAt=new Date(f.publishedAt).toISOString();const input={providerGameId:f.providerGameId,reviewState:f.reviewState,sourceUrl:f.sourceUrl,publishedAt,players,notes:f.notes};
  const response=await fetch('/api/availability',{method:'POST',headers:{'Content-Type':'application/json','X-NBA-Research':'manual'},body:JSON.stringify(input)});const result=await response.json();if(!response.ok)throw new Error(result.message??'Unable to save review');
  $('availability-message').textContent='Report review saved with the current observation time. Earlier forecasts are unchanged. Capture a new board to include this review in a later forecast.';
  window.dispatchEvent(new Event('availability-saved'));
 }catch(e){$('availability-message').textContent=e.message;}finally{button.disabled=false;}
});
loadCandidate();
