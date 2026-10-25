import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildFeatures,fitLogistic,fitMargin,probabilityMetrics,marginMetrics,sigmoid,dot,solve} from '../src/baseline.mjs';
import {auditGames,eligibilityReason} from '../src/research-data.mjs';
const config=JSON.parse(await readFile(new URL('../experiments/baseline-001.json',import.meta.url),'utf8'));
const fixture=Array.from({length:35},(_,i)=>({id:String(i),season:2021,gameDate:new Date(Date.UTC(2021,0,1+i)).toISOString().slice(0,10),homeTeamId:1,awayTeamId:2,homeScore:100+(i%2)*10,awayScore:105}));
test('feature history cannot see its own or future outcome',()=>{
  const a=buildFeatures(fixture,config),changed=fixture.map(g=>({...g}));
  changed[25].homeScore=200;
  const b=buildFeatures(changed,config);
  for(const row of a.filter(r=>r.gameDate<=fixture[25].gameDate))assert.deepEqual(row.x,b.find(r=>r.id===row.id).x);
  assert.notDeepEqual(a.find(r=>r.id==='28').x,b.find(r=>r.id==='28').x);
  assert.deepEqual(a.find(r=>r.id==='26').x,b.find(r=>r.id==='26').x);
});
test('input order does not change features and duplicate team-date games fail',()=>{
  assert.deepEqual(buildFeatures([...fixture].reverse(),config),buildFeatures(fixture,config));
  assert.throws(()=>buildFeatures([...fixture,{...fixture[25],id:'extra'}],config),/multiple games/);
});
test('numeric functions and metrics have checkable answers',()=>{
  assert.equal(sigmoid(0),.5);assert.equal(sigmoid(1000),1);assert.equal(sigmoid(-1000),0);
  const rows=[{x:[1],y:1,margin:2},{x:[1],y:0,margin:-2}];
  const metrics=probabilityMetrics(rows,()=>.5);
  assert.ok(Math.abs(metrics.logLoss-Math.log(2))<1e-12);assert.equal(metrics.brier,.25);assert.equal(metrics.accuracy,.5);
  assert.equal(metrics.calibration.reduce((s,b)=>s+b.n,0),2);
  assert.deepEqual(marginMetrics(rows,()=>0),{n:2,mae:2,rmse:2});
  assert.deepEqual(solve([[2,0],[0,4]],[6,8]),[3,2]);
});
test('fitting recovers a balanced intercept and linear margins',()=>{
  const balanced=Array.from({length:20},(_,i)=>({x:[1],y:i%2,margin:3}));
  assert.ok(Math.abs(fitLogistic(balanced,config.logistic).weights[0])<1e-10);
  const rows=Array.from({length:30},(_,i)=>({x:[1,(i-15)/10],margin:2+3*(i-15)/10}));
  const model=fitMargin(rows,{l2MeanPenalty:0});
  for(const row of rows)assert.ok(Math.abs(dot(model.weights,row.x)-row.margin)<1e-10);
});
test('logistic optimization improves probability loss on a simple signal',()=>{
  const rows=Array.from({length:200},(_,i)=>({x:[1,i<100?-1:1],y:i<100?0:1,margin:0}));
  const model=fitLogistic(rows,config.logistic);
  assert.ok(probabilityMetrics(rows,r=>sigmoid(dot(model.weights,r.x))).logLoss<.1);
  assert.ok(model.weights.every(Number.isFinite));
});
test('coverage is not inferred from page completion or a handful of games',()=>{
  const result=auditGames(fixture,[2021]);assert.equal(result.passed,false);
  assert.equal(result.seasons[0].games,35);assert.equal(result.seasons[0].teams,2);
});
test('official season boundaries exclude mislabeled play-ins and Cup finals',()=>{
  const g={season:2022,date:'2023-04-12',postseason:false,postponed:false,home_team:{id:1},visitor_team:{id:2}};
  assert.equal(eligibilityReason(g,config),'outside_official_regular_season');
  assert.equal(eligibilityReason({...g,date:'2023-04-09'},config),null);
  assert.equal(eligibilityReason({...g,season:2023,date:'2023-12-09'},config),'cup_championship');
});
