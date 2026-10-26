import './candidate.mjs';
import './paper.mjs';
import { validateBet, summarize, netProfit, RESULTS } from './domain.mjs';
const storageKey = 'nba-edge-lab:journal:v1';
// A QA session is isolated from the real journal and expires with its tab.
const qa = location.hash === '#qa';
let storage;
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
let bets = [];
let storageHealthy = true;
try {
  storage = qa ? sessionStorage : localStorage;
  const saved = JSON.parse(storage.getItem(storageKey) || '[]');
  if (!Array.isArray(saved)) throw new Error('Invalid journal');
  const ids = new Set();
  bets = saved.map(b => {
    if (typeof b.id !== 'string' || ids.has(b.id)) throw new Error('Invalid journal ID');
    ids.add(b.id);
    return { ...validateBet(b), id: b.id };
  });
} catch {
  storageHealthy = false;
  $('form-message').textContent = 'The saved journal could not be read. Saving is disabled to protect existing records. Export the original journal for recovery.';
}
function save(next) {
  if (!storageHealthy) throw new Error('Saving is disabled until the existing journal is recovered.');
  storage.setItem(storageKey, JSON.stringify(next));
  bets = next;
  render();
}
function cell(row, text, detail) {
  const td = document.createElement('td'); td.textContent = text;
  if (detail) { const small = document.createElement('small'); small.textContent = detail; td.append(small); }
  row.append(td); return td;
}
function render() {
  const s = summarize(bets);
  $('count').textContent = s.count;
  $('profit').textContent = s.settled ? money(s.profit) : '—';
  $('roi').textContent = s.roi == null ? '—' : `${(s.roi * 100).toFixed(1)}%`;
  $('units').textContent = s.settled ? `${s.unitProfit.toFixed(2)} u` : '—';
  const body = $('bets'); body.replaceChildren();
  if (!bets.length) {
    const row = document.createElement('tr'); const td = cell(row, 'Your placed bets will appear here.'); td.colSpan = 6; td.className = 'empty'; body.append(row);
  }
  for (const bet of [...bets].reverse()) {
    const row = document.createElement('tr');
    const placed = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(bet.placedAt));
    cell(row, bet.game, `${bet.selection} · ${placed} ET`);
    cell(row, bet.book, bet.market);
    cell(row, `${bet.odds > 0 ? '+' : ''}${bet.odds}`, bet.line == null ? undefined : `Spread ${bet.line > 0 ? '+' : ''}${bet.line}`);
    cell(row, money(bet.stake));
    const td = cell(row, ''); const select = document.createElement('select');
    select.setAttribute('aria-label', `Result for ${bet.selection} in ${bet.game}`);
    for (const result of RESULTS) { const option = new Option(result, result); option.selected = result === bet.result; select.add(option); }
    select.addEventListener('change', () => {
      try {
        save(bets.map(b => b.id === bet.id ? { ...b, result: select.value } : b));
        $('form-message').textContent = 'Result updated. Settlement is user-reported.';
      } catch { select.value = bet.result; $('form-message').textContent = 'Could not save the result. Your previous record is unchanged.'; }
    });
    td.append(select);
    const profit = netProfit(bet); cell(row, profit == null ? '—' : money(profit));
    body.append(row);
  }
}
$('today').textContent = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
$('market').addEventListener('change', () => {
  const spread = $('market').value === 'Spread'; $('line').disabled = !spread; $('line').required = spread;
  if (!spread) $('line').value = '';
});
$('bet-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const input = Object.fromEntries(new FormData(event.currentTarget));
    // datetime-local has no zone; explicitly interpret the entered wall time as Eastern.
    const wall = input.placedAt;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wall)) throw new Error('Enter the time placed.');
    const matches = ['-04:00', '-05:00'].map(offset => new Date(wall + ':00' + offset)).filter(date => {
      if (!Number.isFinite(date.getTime())) return false;
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(date).map(p => [p.type, p.value]));
      return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}` === wall;
    });
    if (matches.length !== 1) throw new Error('This Eastern time is ambiguous or does not exist due to daylight saving. Choose an unambiguous time.');
    input.placedAt = matches[0].toISOString();
    if (Date.parse(input.placedAt) > Date.now() + 60000) throw new Error('A placed bet cannot be in the future.');
    const bet = { ...validateBet(input), id: crypto.randomUUID() };
    save([...bets, bet]);
    event.currentTarget.reset(); $('line').disabled = true; $('line').required = false;
    $('form-message').textContent = 'Bet saved in this browser.';
  } catch (error) {
    $('form-message').textContent = error instanceof DOMException ? 'Browser storage is unavailable or full. Export a backup; this bet was not saved.' : error.message;
  }
});
$('export').addEventListener('click', () => {
  let content;
  try { content = storageHealthy ? JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), bets }, null, 2) : storage.getItem(storageKey); }
  catch { $('form-message').textContent = 'Browser storage is unavailable; export could not be read.'; return; }
  const url = URL.createObjectURL(new Blob([content ?? ''], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `nba-edge-lab-journal-${new Date().toISOString().slice(0,10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
if (qa) {
  document.querySelector('.environment').textContent = 'QA SESSION · TEMPORARY RECORDS';
  document.querySelector('#ledger-section > .section-note').textContent = 'QA only: records are isolated from the real journal and expire when this tab closes.';
}
render();

async function showDataStatus() {
  try {
    const response = await fetch('/api/data-status', { cache: 'no-store' });
    if (!response.ok) throw new Error('status unavailable');
    const status = await response.json();
    for (const [element, provider] of [['games-status','balldontlie'],['odds-status','oddsapi']]) {
      const value = status[provider];
      if (!value || typeof value.keyConfigured !== 'boolean') throw new Error('invalid status');
      if (status.keyFileError) $(element).textContent = 'Local key file needs attention. Run the setup check.';
      else if (!value.keyConfigured) $(element).textContent = 'Step 1: create the free account, then save your key locally.';
      else if (!value.lastCollection) $(element).textContent = 'Key saved locally · API access not tested yet.';
      else {
        const date = value.lastCollection.observedAt ? new Intl.DateTimeFormat('en-US',{ timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit' }).format(new Date(value.lastCollection.observedAt)) : 'unknown time';
        $(element).textContent = `Last collection: ${date} ET · ${value.lastCollection.records ?? 'unknown'} records in the latest snapshot. ${provider === 'balldontlie' ? 'See research audit for season coverage.' : 'Research snapshot; Michigan prices unverified.'}`;
      }
    }
    if (status.indexError) $('data-message').textContent = 'The collection history could not be read. Existing records were preserved; data readiness is unknown.';
    if(status.oddsapi.lastCollection) $('odds-readiness').textContent='Snapshot saved · not a live stream';
    for(const [book,label] of [['fanduel','FanDuel'],['draftkings','DraftKings'],['betmgm','BetMGM']]) {
      const seen=status.oddsapi.lastCollection?.booksPresent?.includes(label);
      $('coverage-'+book).textContent=seen?'Seen in latest snapshot · MI unverified':'Documented · absent from latest snapshot or untested';
    }
    $('model-readiness').textContent=status.model;
  } catch {
    $('games-status').textContent = 'Local data status unavailable.';
    $('odds-status').textContent = 'Local data status unavailable.';
    $('data-message').textContent = 'Start the dashboard with npm start to check setup. Missing status is not a successful connection.';
  }
}
showDataStatus();

async function showResearch() {
  try {
    const response=await fetch('/api/research-status',{cache:'no-store'});
    if(!response.ok)throw new Error('unavailable');
    const r=await response.json();
    if(!r.available){$('research-summary').textContent=r.statusError?'Research report could not be verified. Recommendations remain locked.':'No model report is available yet. Historical data must pass the coverage audit before fitting.';return;}
    $('research-summary').textContent=`Fitted on season start years ${r.trainSeasons.join(', ')}; development evaluation on ${r.developmentSeasons.join(', ')}. The ${r.sealedTestSeasons.join(', ')} final performance test remains unopened. Historical score availability is a retrospective approximation.`;
    $('training-count').textContent=r.trainingRows.toLocaleString();
    $('development-count').textContent=r.developmentRows.toLocaleString();
    $('margin-error').textContent=r.marginModel.mae.toFixed(2)+' pts';
    const body=$('model-metrics');body.replaceChildren();
    for(const [label,value] of [['Logistic baseline',r.candidate],['Fixed Elo comparator',r.eloBaseline],['Home-frequency comparator',r.homeFrequencyBaseline]]){
      const row=document.createElement('tr');cell(row,label);cell(row,value.logLoss.toFixed(4));cell(row,value.brier.toFixed(4));cell(row,(value.accuracy*100).toFixed(1)+'%');body.append(row);
    }
    $('model-readiness').textContent='Development baseline fitted';
  }catch{$('research-summary').textContent='Research status unavailable. Recommendations remain locked.';}
}
showResearch();

window.addEventListener('paper-data-updated',showDataStatus);
