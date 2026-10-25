import {runPaperOperation,paperBoard} from '../src/paper-engine.mjs';
try{
  const args=process.argv.slice(2);
  if(args.length!==1||!['capture','results','status'].includes(args[0]))throw new Error('Use paper:capture, paper:results, or paper:status.');
  console.log(JSON.stringify(args[0]==='status'?await paperBoard():await runPaperOperation(args[0]),null,2));
}catch(e){console.error(e.code?`${e.code}: ${e.message}`:'Paper operation failed. Check setup and the saved research record.');process.exitCode=1;}
