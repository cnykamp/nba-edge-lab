import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {ROOT} from '../src/config.mjs';
import {loadResearchData} from '../src/research-data.mjs';
try {
  const config=JSON.parse(await readFile(join(ROOT,'experiments','baseline-001.json'),'utf8'));
  const {manifest}=await loadResearchData(config);
  console.log(JSON.stringify({passed:manifest.passed,pagination:manifest.pagination,coverage:manifest.coverage,revisions:manifest.revisions,exclusions:manifest.exclusions,uniqueGames:manifest.uniqueGames,datasetHash:manifest.datasetHash},null,2));
  if(!manifest.passed)process.exitCode=1;
}catch{console.error('Coverage audit could not finish. No model was fitted.');process.exitCode=1;}
