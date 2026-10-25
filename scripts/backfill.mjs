import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout} from 'node:timers/promises';
import {collect} from '../src/collection.mjs';
import {ROOT} from '../src/config.mjs';

let calls=0;
try {
  const config=JSON.parse(await readFile(join(ROOT,'experiments','baseline-001.json'),'utf8'));
  for(const season of config.seasons){
    let cursor=null,pages=0,records=0;const seen=new Set();
    while(true){
      if(seen.has(cursor)||++pages>20||calls>=100)throw new Error('Backfill safety bound reached.');
      seen.add(cursor);
      let index={collections:[],attempts:[]};
      try{index=JSON.parse(await readFile(join(ROOT,'data','collection-index.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
      let page=index.collections.filter(c=>c.provider==='balldontlie'&&c.query.season===season&&(c.query.cursor??null)===cursor).at(-1);
      if(!page){
        const last=index.attempts.filter(c=>c.provider==='balldontlie').at(-1);
        const wait=last?Math.max(0,13100-(Date.now()-Date.parse(last.at))):0;
        if(wait)await setTimeout(wait);
        page=await collect('balldontlie',{season,cursor});calls++;
      }
      records+=page.records;
      console.log(JSON.stringify({season,pages,records,nextPage:page.nextCursor!==null,callsThisRun:calls}));
      if(page.nextCursor===null)break;
      cursor=page.nextCursor;
    }
  }
  console.log('Page chains exhausted. Run research:audit before fitting.');
}catch(error){console.error('Backfill stopped: '+(error.code||'LOCAL_ERROR')+'. Existing snapshots were preserved.');process.exitCode=1;}
