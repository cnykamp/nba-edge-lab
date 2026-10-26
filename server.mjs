import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dataStatus } from './src/collection.mjs';
import { researchStatus } from './src/research-status.mjs';
import { candidateBoard as paperBoard, runCandidateOperation as runPaperOperation } from './src/candidate-engine.mjs';
import {candidateStatus} from './src/candidate-research.mjs';
import {saveAvailability} from './src/availability.mjs';

// Exact routes avoid exposing repository files, credentials, or raw data.
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.mjs', ['app.mjs', 'text/javascript; charset=utf-8']],
  ['/paper.mjs', ['paper.mjs', 'text/javascript; charset=utf-8']],
  ['/candidate.mjs', ['candidate.mjs', 'text/javascript; charset=utf-8']],
  ['/domain.mjs', ['domain.mjs', 'text/javascript; charset=utf-8']],
]);
export function makeServer({ root, environment, paperOperation = runPaperOperation } = {}) {
  let operation={running:false};
  return createServer(async (req, res) => {
    const json=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
    if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host??''))return json(403,{message:'Use the local loopback dashboard address.'});
    if(req.url==='/api/candidate-status'&&req.method==='GET')return json(200,await candidateStatus(root));
    if(req.url==='/api/availability'&&req.method==='POST') {
      const host=req.headers.host??'';
      if(req.headers.origin!==`http://${host}`||req.headers['x-nba-research']!=='manual'||req.headers['content-type']!=='application/json'||!/^\d+$/.test(req.headers['content-length']??'')||Number(req.headers['content-length'])>20000||req.headers['transfer-encoding'])return json(403,{message:'Use the local dashboard to save a review.'});
      if(operation.running)return json(409,{message:'Wait for the research operation to finish.'});
      try {
        let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>20000)return json(413,{message:'Review is too large.'});}
        return json(200,await saveAvailability(JSON.parse(body),{root}));
      }catch(e){return json(400,{message:e instanceof SyntaxError?'Invalid review format.':e.message});}
    }
    if(req.url==='/api/paper-board'&&req.method==='GET')return json(200,{...await paperBoard(root),operation});
    if(['/api/paper-capture','/api/paper-results'].includes(req.url)&&req.method==='POST') {
      // Loopback, exact Origin and custom header block cross-site forms and DNS rebinding.
      const host=req.headers.host??'';
      if(!/^127\.0\.0\.1:\d+$/.test(host)||req.headers.origin!==`http://${host}`||req.headers['x-nba-research']!=='manual'||req.headers['content-type']!=='application/json'||Number(req.headers['content-length']??0)>64||req.headers['transfer-encoding'])return json(403,{message:'Open the local dashboard to run this action.'});
      if(operation.running)return json(409,{message:'A research operation is already running.'});
      const mode=req.url==='/api/paper-capture'?'capture':'results';
      operation={running:true,mode,startedAt:new Date().toISOString()};
      json(202,{accepted:true,mode});
      // Request starts work; dashboard polling never collects or trains.
      void Promise.resolve().then(()=>paperOperation(mode,{root,environment})).then(result=>{operation={running:false,mode,completedAt:new Date().toISOString(),result};},error=>{operation={running:false,mode,completedAt:new Date().toISOString(),message:error.code?error.message:'Research operation failed; saved records were preserved.'};});
      return;
    }
    if (req.url === '/api/research-status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(JSON.stringify(await researchStatus(root)));
    }
    if (req.url === '/api/data-status' && req.method === 'GET') {
      const status = await dataStatus(root, environment);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(JSON.stringify(status));
    }
    const route = routes.get(req.url);
    if (!route || !['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(404); return res.end('Not found');
    }
    try {
      const body = await readFile(new URL(`./public/${route[0]}`, import.meta.url));
      res.writeHead(200, {
        'Content-Type': route[1], 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(500); res.end('Unable to load dashboard');
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const server = makeServer();
  server.listen(port, '127.0.0.1', () => console.log(`NBA Edge Lab: http://127.0.0.1:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
