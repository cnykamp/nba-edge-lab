import { readFile, mkdir, writeFile, open, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT } from '../src/config.mjs';
import { loadResearchData } from '../src/research-data.mjs';
import { buildFeatures, fitLogistic, fitMargin, probabilityMetrics, marginMetrics, sigmoid, dot } from '../src/baseline.mjs';

let registeredDirectory=null;
try {
  if(process.argv.length!==2)throw new Error('No tuning or final-test flags are supported.');
  try{await lstat(join(ROOT,'artifacts','baseline-001','registration.json'));const error=new Error('Already registered');error.code='EEXIST';throw error;}catch(error){if(error.code!=='ENOENT')throw error;}
  const configText=await readFile(join(ROOT,'experiments','baseline-001.json'),'utf8');
  const config=JSON.parse(configText);
  const {games,manifest}=await loadResearchData(config);
  const artifactDir=join(ROOT,'artifacts','baseline-001');await mkdir(artifactDir,{recursive:true,mode:0o700});
  await writeFile(join(artifactDir,'coverage-audit.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
  if(!manifest.passed)throw new Error('Coverage/pagination audit did not pass; training was not started. Inspect the private coverage audit.');
  const configHash=createHash('sha256').update(configText).digest('hex');
  const codeHashes=[];
  for(const file of ['src/baseline.mjs','src/research-data.mjs','scripts/research.mjs'])codeHashes.push({file,sha256:createHash('sha256').update(await readFile(join(ROOT,file))).digest('hex')});
  const lock={experimentId:config.id,registeredAt:new Date().toISOString(),configHash,codeHashes,datasetHash:manifest.datasetHash,snapshotHashes:manifest.snapshotHashes,finalTestOpened:false};
  // Exclusive registration prevents silently rerunning or revising an inspected experiment.
  const registration=await open(join(artifactDir,'registration.json'),'wx',0o600);
  try {await registration.writeFile(JSON.stringify(lock,null,2)+'\n');}finally{await registration.close();}
  registeredDirectory=artifactDir;
  const rows=buildFeatures(games,config);
  const training=rows.filter(r=>config.trainSeasons.includes(r.season));
  const development=rows.filter(r=>config.developmentSeasons.includes(r.season));
  if(training.length<2000||development.length<1000)throw new Error('Insufficient eligible training/development rows.');
  const logistic=fitLogistic(training,config.logistic),margin=fitMargin(training,config.marginRidge);
  const homeRate=training.reduce((s,r)=>s+r.y,0)/training.length;
  const homeMargin=training.reduce((s,r)=>s+r.margin,0)/training.length;
  const walkForward=[];
  for(const fold of config.walkForwardFolds){
    const train=rows.filter(r=>fold.train.includes(r.season)),validation=rows.filter(r=>fold.validate.includes(r.season));
    const fitted=fold.train.join(',')===config.trainSeasons.join(',')?logistic:fitLogistic(train,config.logistic);
    const base=train.reduce((s,r)=>s+r.y,0)/train.length;
    walkForward.push({trainSeasons:fold.train,validateSeasons:fold.validate,trainingRows:train.length,candidate:probabilityMetrics(validation,r=>sigmoid(dot(fitted.weights,r.x)),config.calibrationBuckets),homeFrequencyBaseline:probabilityMetrics(validation,()=>base,config.calibrationBuckets),eloBaseline:probabilityMetrics(validation,r=>r.eloProbability,config.calibrationBuckets)});
  }
  const report={
    experimentId:config.id,createdAt:new Date().toISOString(),configHash,codeHashes,datasetHash:manifest.datasetHash,
    state:'Development baseline fitted; no betting qualification',
    trainSeasons:config.trainSeasons,developmentSeasons:config.developmentSeasons,sealedTestSeasons:config.sealedTestSeasons,
    trainingRows:training.length,developmentRows:development.length,finalTestOpened:false,
    coverage:manifest.coverage,
    walkForward,
    candidate:probabilityMetrics(development,r=>sigmoid(dot(logistic.weights,r.x)),config.calibrationBuckets),
    homeFrequencyBaseline:probabilityMetrics(development,()=>homeRate,config.calibrationBuckets),
    eloBaseline:probabilityMetrics(development,r=>r.eloProbability,config.calibrationBuckets),
    marginModel:marginMetrics(development,r=>dot(margin.weights,r.x)),
    meanMarginBaseline:marginMetrics(development,()=>homeMargin),
    fitting:{iterations:logistic.iterations,gradientMax:logistic.gradientMax},
    recommendationsEnabled:false,bettingReturns:null,marketComparison:null,uncertaintyIntervals:null,
    limitations:['Retrospective final-score availability assumption; historical corrections are not independently archived.','No historical sportsbook prices or selected-bet return evaluation.','Final holdout remains unopened; forward evidence pending.','No injuries, player lineups or roster-change model.','Model selection and retraining are disabled in this experiment.'],
  };
  await writeFile(join(artifactDir,'model.json'),JSON.stringify({configHash,datasetHash:manifest.datasetHash,logistic,margin,featureNames:config.features},null,2)+'\n',{flag:'wx',mode:0o600});
  await writeFile(join(artifactDir,'development-report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify(report,null,2));
}catch(error){
  const safe=error.code==='EEXIST'?'Experiment already registered. Do not rerun or tune against inspected results.':error.message;
  if(registeredDirectory)try{await writeFile(join(registeredDirectory,'failure.json'),JSON.stringify({experimentId:'baseline-001',failedAt:new Date().toISOString(),message:safe,finalTestOpened:false},null,2)+'\n',{flag:'wx',mode:0o600});}catch{}
  console.error(safe);process.exitCode=1;
}
