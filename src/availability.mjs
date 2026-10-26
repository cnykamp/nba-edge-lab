import {mkdir,open,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ROOT} from './config.mjs';
import {readLedger,appendLedger} from './paper-ledger.mjs';
export const AVAILABILITY_STATUSES=['Out','Doubtful','Questionable','Probable','Available','Not yet submitted'];
export function validateReview(input,game,observedAt) {
  if(!game||typeof input!=='object'||input===null)throw new Error('Choose a saved matchup');
  const u=new URL(input.sourceUrl);
  if(u.protocol!=='https:'||u.username||u.password||u.port||!((u.hostname==='official.nba.com'&&/^\/nba-injury-report-\d{4}-\d{2}-season\/?$/.test(u.pathname))||(u.hostname==='ak-static.cms.nba.com'&&/^\/referee\/injury\/Injury-Report_.*\.pdf$/.test(u.pathname)))||u.search||u.hash)throw new Error('Use the official season injury-report page or official injury PDF URL');
  if(typeof input.publishedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(input.publishedAt)||!Number.isFinite(Date.parse(input.publishedAt))||Date.parse(input.publishedAt)>Date.parse(observedAt))throw new Error('Report publication time must be valid and no later than now');
  if(!['both_teams_reviewed','incomplete','not_submitted'].includes(input.reviewState))throw new Error('Choose a review state');
  if(!Array.isArray(input.players)||input.players.length>60)throw new Error('Too many player rows');
  const clean=value=>typeof value==='string'&&value.length<=240&&!/[\x00-\x1f]/.test(value);
  for(const p of input.players)if(![game.home,game.away].includes(p.team)||!clean(p.player)||!p.player.trim()||!AVAILABILITY_STATUSES.includes(p.status)||!clean(p.reason??''))throw new Error('Each row needs a matchup team, player, supported status and short reason');
  if(!clean(input.notes??''))throw new Error('Use a short review note');
  return {type:'injury_review',id:randomUUID(),providerGameId:game.providerGameId,home:game.home,away:game.away,sourceUrl:u.href,publishedAt:new Date(input.publishedAt).toISOString(),observedAt,reviewState:input.reviewState,players:input.players.map(p=>({team:p.team,player:p.player.trim(),status:p.status,reason:p.reason??''})),notes:input.notes??'',source:'User-entered official report review; not independently API-verified',modelImpact:'No fitted injury adjustment; recommendations remain disabled'};
}
export function availabilityAt(records,game,cutoff) {
  const review=records.filter(r=>r.entry.type==='injury_review'&&r.entry.providerGameId===game.providerGameId&&r.entry.home===game.home&&r.entry.away===game.away&&Date.parse(r.entry.observedAt)<=Date.parse(cutoff)).at(-1);
  if(!review)return {state:'unreviewed',reason:'No report review observed before forecast cutoff',recommendationsEnabled:false};
  const r=review.entry,stale=Date.parse(cutoff)-Date.parse(r.publishedAt)>6*3600000;
  const unresolved=r.players.some(p=>['Questionable','Doubtful','Not yet submitted'].includes(p.status));
  return {...r,recordHash:review.hash,state:stale?'stale':r.reviewState!=='both_teams_reviewed'?'incomplete':unresolved?'unresolved':'reviewed',reason:stale?'Report is more than six hours old':unresolved?'Participation remains unresolved':'Manual report observation; player impact is not modeled',recommendationsEnabled:false};
}
export async function saveAvailability(input,{root=ROOT,now=()=>new Date().toISOString()}={}) {
  const dir=join(root,'data/paper');await mkdir(dir,{recursive:true,mode:0o700});let lock;
  try{lock=await open(join(dir,'.operation-lock'),'wx',0o600);}catch{throw new Error('A research operation is running; try again after it finishes');}
  try {
    const records=await readLedger(root),game=records.filter(r=>r.entry.type==='capture').flatMap(r=>r.entry.games).find(g=>g.providerGameId===input.providerGameId);
    const entry=validateReview(input,game,now());const saved=await appendLedger(root,entry);
    return {saved:true,id:entry.id,observedAt:entry.observedAt,hash:saved.hash};
  }finally{await lock.close();await unlink(join(dir,'.operation-lock'));}
}
