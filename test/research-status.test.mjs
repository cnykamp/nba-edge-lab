import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {researchStatus} from '../src/research-status.mjs';
test('research readiness never follows from a key, collection or invalid report',async()=>{
  const root=await mkdtemp(join(tmpdir(),'nba-research-status-'));
  try {
    assert.equal((await researchStatus(root)).available,false);
    const dir=join(root,'artifacts','baseline-001');await mkdir(dir,{recursive:true});
    await writeFile(join(dir,'development-report.json'),'{}');
    const status=await researchStatus(root);assert.equal(status.available,false);assert.equal(status.statusError,true);
    assert.equal(status.recommendationsEnabled,false);
  }finally{await rm(root,{recursive:true,force:true});}
});
