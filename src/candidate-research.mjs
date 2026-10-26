import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {ROOT} from './config.mjs';
import {loadFrozenBaseline} from './paper-engine.mjs';
import {hash} from './paper-ledger.mjs';
import {buildFeatures,dot,sigmoid,probabilityMetrics} from './baseline.mjs';
import {candidateRows,fitCandidate,evaluateCandidate} from './candidate-model.mjs';
export const CANDIDATE_SOURCES=['src/candidate-model.mjs','src/candidate-research.mjs','scripts/candidate.mjs'];
export async function runCandidateResearch(root=ROOT) {
  const configText=await readFile(join(root,'experiments/candidate-002.json'),'utf8'),config=JSON.parse(configText);
  const frozen=await loadFrozenBaseline(root),dir=join(root,'artifacts/candidate-002');
  const codeHashes=[];for(const file of CANDIDATE_SOURCES)codeHashes.push({file,sha256:hash(await readFile(join(root,file),'utf8'))});
  const registration={experimentId:config.id,registeredAt:new Date().toISOString(),configHash:hash(configText),codeHashes,datasetHash:frozen.model.datasetHash,baselineModelHash:frozen.modelHash,historySnapshotHashes:frozen.historySnapshotHashes,finalTestOpened:false};
  await mkdir(dir,{recursive:true,mode:0o700});
  await writeFile(join(dir,'registration.json'),JSON.stringify(registration,null,2)+'\n',{flag:'wx',mode:0o600});
  try {
    // Remove sealed outcomes before constructing any evaluation rows.
    const developmentHistory=frozen.history.filter(g=>!config.sealedTestSeasons.includes(g.season));
    const baselineRows=buildFeatures(developmentHistory,frozen.config),experiments=[];let primary=null;
    for(const variant of config.variants) {
      const rows=candidateRows(developmentHistory,config,variant);
      const folds=[];
      for(const [i,fold] of config.folds.entries()) {
        const model=fitCandidate(rows,fold,config),evaluation=rows.filter(r=>fold.evaluate.includes(r.season));
        const ids=new Set(evaluation.map(r=>r.id)),pairedBaseline=baselineRows.filter(r=>ids.has(r.id));
        if(pairedBaseline.length!==evaluation.length)throw new Error('Baseline comparison grouping differs');
        folds.push({fold,trainingRows:model.trainingRows,calibrationRows:model.calibrationRows,evaluationRows:evaluation.length,...evaluateCandidate(model,evaluation,config),originalBaseline:probabilityMetrics(pairedBaseline,r=>sigmoid(dot(frozen.model.logistic.weights,r.x))),baselineComparisonNote:'Original baseline was fitted through 2023; its 2023 comparison is in-sample and descriptive only. Candidate raw/calibrated comparisons are chronological.',fitting:{logistic:model.logistic,calibrator:model.calibrator}});
        if(variant.id===config.primaryVariant&&i===config.folds.length-1)primary={...model,variant,configHash:registration.configHash,datasetHash:registration.datasetHash,experimentId:config.id};
      }
      experiments.push({variant,folds});
    }
    const modelText=JSON.stringify(primary,null,2)+'\n';
    const report={...registration,modelHash:hash(modelText),createdAt:new Date().toISOString(),primaryVariant:config.primaryVariant,experiments,recommendationsEnabled:false,automaticPromotion:false,bettingReturns:null,finalTestOpened:false,forwardReview:config.qualification.review};
    await writeFile(join(dir,'model.json'),modelText,{flag:'wx',mode:0o600});
    await writeFile(join(dir,'development-report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
    return report;
  }catch(error){await writeFile(join(dir,'failure.json'),JSON.stringify({failedAt:new Date().toISOString(),message:'Candidate experiment failed; no tuning rerun permitted without new registration',finalTestOpened:false})+'\n',{flag:'wx',mode:0o600});throw error;}
}
export async function loadCandidate(root=ROOT) {
  const text=await readFile(join(root,'experiments/candidate-002.json'),'utf8'),config=JSON.parse(text),dir=join(root,'artifacts/candidate-002');
  const registration=JSON.parse(await readFile(join(dir,'registration.json'),'utf8'));
  for(const source of CANDIDATE_SOURCES)if(registration.codeHashes.find(r=>r.file===source)?.sha256!==hash(await readFile(join(root,source),'utf8')))throw new Error('Candidate source changed after fit');
  const modelText=await readFile(join(dir,'model.json'),'utf8'),model=JSON.parse(modelText),report=JSON.parse(await readFile(join(dir,'development-report.json'),'utf8'));
  if(report.modelHash!==hash(modelText))throw new Error('Candidate model hash mismatch');
  if(hash(text)!==registration.configHash||model.configHash!==registration.configHash||model.datasetHash!==registration.datasetHash||model.variant.id!==config.primaryVariant||registration.finalTestOpened!==false)throw new Error('Candidate registration mismatch');
  if(![model.logistic.weights,model.margin.weights].every(a=>a?.length===8&&a.every(Number.isFinite))||model.calibrator.weights?.length!==2||!model.calibrator.weights.every(Number.isFinite)||!model.residuals?.length||!model.residuals.every(Number.isFinite))throw new Error('Invalid candidate');
  return {config,model,modelHash:hash(modelText),registration};
}
export async function candidateStatus(root=ROOT) {
  try {
    const {config,model,modelHash}=await loadCandidate(root),report=JSON.parse(await readFile(join(root,'artifacts/candidate-002/development-report.json'),'utf8'));
    if(report.finalTestOpened!==false||report.recommendationsEnabled!==false||report.configHash!==model.configHash)throw new Error('Invalid candidate report');
    return {available:true,experimentId:config.id,primaryVariant:config.primaryVariant,modelHash,finalTestOpened:false,recommendationsEnabled:false,forwardReview:config.qualification.review,experiments:report.experiments.map(e=>({variant:e.variant,folds:e.folds.map(f=>({fold:f.fold,trainingRows:f.trainingRows,calibrationRows:f.calibrationRows,evaluationRows:f.evaluationRows,raw:f.raw,calibrated:f.calibrated,originalBaseline:f.originalBaseline,baselineComparisonNote:f.baselineComparisonNote,elo:f.elo,margin:f.margin,interval:f.interval,syntheticSpreads:f.syntheticSpreads,converged:f.fitting.logistic.converged&&f.fitting.calibrator.converged}))})),primary:{trainingRows:model.trainingRows,calibrationRows:model.calibrationRows}};
  }catch(e){return {available:false,statusError:e.code!=='ENOENT',recommendationsEnabled:false,finalTestOpened:false};}
}
