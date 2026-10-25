import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {ROOT} from './config.mjs';

export async function researchStatus(root=ROOT) {
  const empty={available:false,state:'Not trained',recommendationsEnabled:false,finalTestOpened:false};
  try {
    const r=JSON.parse(await readFile(join(root,'artifacts','baseline-001','development-report.json'),'utf8'));
    if(r.experimentId!=='baseline-001'||r.finalTestOpened!==false||r.recommendationsEnabled!==false)throw new Error('unexpected report');
    if(![r.trainingRows,r.developmentRows].every(n=>Number.isSafeInteger(n)&&n>0)||![r.trainSeasons,r.developmentSeasons,r.sealedTestSeasons].every(xs=>Array.isArray(xs)&&xs.length&&xs.every(Number.isInteger))||!Number.isFinite(Date.parse(r.createdAt)))throw new Error('invalid report metadata');
    const probability=value=>{
      if(!value||![value.n,value.logLoss,value.brier,value.accuracy].every(Number.isFinite)||value.n<=0)throw new Error('invalid metrics');
      return {n:value.n,logLoss:value.logLoss,brier:value.brier,accuracy:value.accuracy};
    };
    if(!Number.isFinite(r.marginModel?.mae)||!Number.isFinite(r.marginModel?.rmse))throw new Error('invalid margin metrics');
    return {
      available:true,state:'Development baseline fitted',experimentId:r.experimentId,
      createdAt:r.createdAt,trainingRows:r.trainingRows,developmentRows:r.developmentRows,
      trainSeasons:r.trainSeasons,developmentSeasons:r.developmentSeasons,sealedTestSeasons:r.sealedTestSeasons,
      candidate:probability(r.candidate),homeFrequencyBaseline:probability(r.homeFrequencyBaseline),eloBaseline:probability(r.eloBaseline),
      marginModel:{mae:r.marginModel.mae,rmse:r.marginModel.rmse},
      recommendationsEnabled:false,finalTestOpened:false,
      historicalAvailability:'Retrospective approximation; historical publication/correction timing unverified',
      bettingReturns:null,uncertaintyIntervals:null,
    };
  }catch(error){return {...empty,statusError:error.code!=='ENOENT'};}
}
