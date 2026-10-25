import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export const hash=text=>createHash('sha256').update(text).digest('hex');
export async function readLedger(root) {
  const directory=join(root,'data','paper','ledger');
  let files;
  try{files=await readdir(directory);}catch(e){if(e.code==='ENOENT')return [];throw e;}
  if(files.some(f=>!/^\d{8}\.json$/.test(f)))throw new Error('Paper ledger contains an unexpected file.');
  const records=[];let previousHash=null;
  for(const [i,file] of files.sort().entries()) {
    if(file!==String(i+1).padStart(8,'0')+'.json')throw new Error('Paper ledger has a missing record.');
    const r=JSON.parse(await readFile(join(directory,file),'utf8'));
    if(r.sequence!==i+1||r.previousHash!==previousHash||r.hash!==hash(JSON.stringify({sequence:r.sequence,previousHash:r.previousHash,entry:r.entry})))throw new Error('Paper ledger integrity check failed.');
    records.push(r);previousHash=r.hash;
  }
  return records;
}
// Caller must hold the paper operation lock. Exclusive files prevent replacement.
export async function appendLedger(root,entry) {
  const records=await readLedger(root);
  const value={sequence:records.length+1,previousHash:records.at(-1)?.hash??null,entry};
  const record={...value,hash:hash(JSON.stringify(value))};
  const directory=join(root,'data','paper','ledger');await mkdir(directory,{recursive:true,mode:0o700});
  await writeFile(join(directory,String(value.sequence).padStart(8,'0')+'.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});
  return record;
}
