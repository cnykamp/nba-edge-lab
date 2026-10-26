import {runCandidateOperation,candidateBoard} from '../src/candidate-engine.mjs';
try {
 const mode=process.argv[2];
 if(!['capture','results','status'].includes(mode)||process.argv.length!==3)throw new Error('Use capture, results or status');
 console.log(JSON.stringify(mode==='status'?await candidateBoard():await runCandidateOperation(mode),null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
