import {runCandidateResearch} from '../src/candidate-research.mjs';
try {
 if(process.argv.length!==2)throw new Error('No tuning or final-test flags supported');
 const r=await runCandidateResearch();
 console.log(JSON.stringify({experimentId:r.experimentId,finalTestOpened:r.finalTestOpened,primaryVariant:r.primaryVariant,results:r.experiments.map(e=>({variant:e.variant.id,folds:e.folds.map(f=>({evaluate:f.fold.evaluate,raw:f.raw.logLoss,calibrated:f.calibrated.logLoss,marginMAE:f.margin.mae,intervalCoverage:f.interval.coverage}))}))},null,2));
}catch(e){console.error(e.code==='EEXIST'?'Experiment already registered; no rerun allowed.':e.message);process.exitCode=1;}
