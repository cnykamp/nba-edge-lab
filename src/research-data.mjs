import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT } from './config.mjs';

export function eligibilityReason(game,config) {
  const bounds=config.regularSeasonBoundaries?.[game.season];
  if(!bounds)throw new Error('Missing officially sourced season boundaries');
  const date=typeof game.date==='string'?game.date.slice(0,10):'';
  if(date<bounds.start||date>bounds.end)return 'outside_official_regular_season';
  if(bounds.cupFinalDate===date||game.ist_stage==='Championship')return 'cup_championship';
  if(game.postseason!==false)return 'postseason_or_unknown';
  if(game.postponed===true)return 'postponed';
  if(![game.home_team?.id,game.visitor_team?.id].every(id=>Number.isInteger(id)&&id>=1&&id<=30))return 'nonstandard_teams';
  return null;
}

export function auditGames(games, seasons, expected = 1230) {
  const audits = seasons.map(season => {
    const rows = games.filter(g => g.season === season);
    const teams = new Map();
    const teamDates=new Set();let sameDayConflicts=0;
    for (const g of rows) for (const id of [g.homeTeamId,g.awayTeamId]) {
      teams.set(id,(teams.get(id)||0)+1);
      const key=id+':'+g.gameDate;if(teamDates.has(key))sameDayConflicts++;teamDates.add(key);
    }
    return {
      season, games: rows.length, teams: teams.size,
      firstDate: rows.map(g=>g.gameDate).sort()[0] ?? null,
      lastDate: rows.map(g=>g.gameDate).sort().at(-1) ?? null,
      minGamesPerTeam: teams.size ? Math.min(...teams.values()) : 0,
      maxGamesPerTeam: teams.size ? Math.max(...teams.values()) : 0,
      sameDayConflicts,
      passed: rows.length === expected && teams.size === 30 && [...teams.values()].every(n=>n===82)&&sameDayConflicts===0,
    };
  });
  return { seasons: audits, passed: audits.every(a=>a.passed) };
}
export async function loadResearchData(config, root = ROOT) {
  const index = JSON.parse(await readFile(join(root,'data','collection-index.json'),'utf8'));
  const snapshots = index.collections.filter(c=>c.provider==='balldontlie' && config.seasons.includes(c.query.season));
  const byId = new Map(), snapshotHashes = [];
  let revisions = 0, excluded = 0;
  const exclusions={};
  for (const c of [...snapshots].sort((a,b)=>a.observedAt.localeCompare(b.observedAt))) {
    if (!/^[a-f0-9-]{36}$/.test(c.id)) throw new Error('Invalid snapshot ID');
    const text = await readFile(join(root,'data','snapshots','balldontlie',c.id+'.json'),'utf8');
    snapshotHashes.push({ id:c.id, sha256:createHash('sha256').update(text).digest('hex') });
    const snapshot = JSON.parse(text);
    for (const g of snapshot.raw.data) {
      const final=g.status_state!=null?g.status_state==='final':g.status==='Final';
      if(!final)continue;
      // Never infer regular-season membership from scores or outcomes.
      const reason=eligibilityReason(g,config);
      if(reason){excluded++;exclusions[reason]=(exclusions[reason]||0)+1;continue;}
      if (g.home_team_score === g.visitor_team_score || ![g.home_team_score,g.visitor_team_score].every(n=>Number.isInteger(n)&&n>=0) || !/^\d{4}-\d{2}-\d{2}/.test(g.date)) throw new Error('Invalid final-score row');
      const row = {id:String(g.id),season:g.season,gameDate:g.date.slice(0,10),homeTeamId:g.home_team.id,awayTeamId:g.visitor_team.id,home:g.home_team.full_name,away:g.visitor_team.full_name,homeScore:g.home_team_score,awayScore:g.visitor_team_score};
      const existing = byId.get(row.id);
      if (existing && JSON.stringify(existing)!==JSON.stringify(row)) revisions++;
      byId.set(row.id,row);
    }
  }
  const games = [...byId.values()].sort((a,b)=>a.gameDate.localeCompare(b.gameDate)||a.id.localeCompare(b.id));
  const pagination = config.seasons.map(season=>{
    const visited=new Set();let cursor=null,exhausted=false;
    while(!visited.has(cursor)) {
      visited.add(cursor);
      const page=snapshots.filter(c=>c.query.season===season&&(c.query.cursor??null)===cursor).at(-1);
      if(!page)break;
      if(page.nextCursor===null){exhausted=true;break;}
      cursor=page.nextCursor;
    }
    return {season,exhausted,pages:visited.size};
  });
  const coverage=auditGames(games,config.seasons,config.coverageRequirements.regularGamesPerSeason);
  const manifest={snapshotHashes,pagination,coverage,revisions,excluded,exclusions,uniqueGames:games.length};
  manifest.datasetHash=createHash('sha256').update(JSON.stringify(games)).digest('hex');
  manifest.passed=coverage.passed&&pagination.every(p=>p.exhausted)&&revisions===0;
  return {games,manifest};
}
