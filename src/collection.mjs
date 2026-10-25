import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, open, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, readKeys } from './config.mjs';
import { CollectionError, fetchProvider, gamesRequest, oddsRequest, normalizeGames, normalizeOdds } from './providers.mjs';
import { researchStatus } from './research-status.mjs';

const INDEX = 'collection-index.json';
async function readIndex(root) {
  try {
    const value = JSON.parse(await readFile(join(root, 'data', INDEX), 'utf8'));
    if (value.version !== 1 || !Array.isArray(value.attempts) || !Array.isArray(value.collections)) throw new Error('bad index');
    return value;
  } catch (error) {
    if (error.code === 'ENOENT') return { version: 1, attempts: [], collections: [] };
    throw new CollectionError('LOCAL_DATA_ERROR', 'The local collection index cannot be read. Existing files were preserved.');
  }
}
async function writeIndex(root, index) {
  const target = join(root, 'data', INDEX);
  const temp = `${target}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(index, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  await rename(temp, target);
}
export function checkBudget(index, provider, now) {
  const attempts = index.attempts.filter(a => a.provider === provider);
  if (provider === 'balldontlie' && attempts.some(a => Date.parse(now) - Date.parse(a.at) < 13000)) {
    throw new CollectionError('LOCAL_RATE_LIMIT', 'Wait at least 13 seconds between game-data requests.');
  }
  if (provider === 'oddsapi') {
    const month = now.slice(0, 7), day = now.slice(0, 10);
    // Reserve conservatively even for failed requests; quotas shared with other apps are separate.
    const monthCost = attempts.filter(a => a.at.startsWith(month)).reduce((s, a) => s + a.reservedCredits, 0);
    const dayCost = attempts.filter(a => a.at.startsWith(day)).reduce((s, a) => s + a.reservedCredits, 0);
    if (monthCost + 2 > 240 || dayCost + 2 > 8) throw new CollectionError('LOCAL_BUDGET_LIMIT', 'Local odds budget reached (8 credits/day; 240/month). Collection stopped.');
    const last = attempts.at(-1);
    if (last && Date.parse(now) - Date.parse(last.at) < 60000) throw new CollectionError('LOCAL_RATE_LIMIT', 'Wait at least 60 seconds between odds snapshots.');
  }
}
export async function collect(provider, { season, cursor, startDate, endDate, root = ROOT, environment = process.env, fetchImpl = fetch } = {}) {
  if (!['balldontlie', 'oddsapi'].includes(provider)) throw new CollectionError('INVALID_ARGUMENT', 'Unsupported provider. TheRundown archival collection is disabled.');
  const url = provider === 'balldontlie' ? gamesRequest(season, cursor, { startDate, endDate }) : oddsRequest();
  const keys = await readKeys(root, environment);
  const key = keys[provider === 'balldontlie' ? 'BALLDONTLIE_API_KEY' : 'ODDS_API_KEY'];
  if (!key) throw new CollectionError('MISSING_KEY', 'No local provider key is configured. Run npm run setup:keys.');
  const dataDir = join(root, 'data'); await mkdir(dataDir, { recursive: true, mode: 0o700 });
  let lock;
  try { lock = await open(join(dataDir, '.collection-lock'), 'wx', 0o600); }
  catch { throw new CollectionError('COLLECTION_LOCKED', 'Another collection may be running. No request was sent.'); }
  try {
    const index = await readIndex(root);
    const now = new Date().toISOString(); checkBudget(index, provider, now);
    index.attempts.push({ provider, at: now, reservedCredits: provider === 'oddsapi' ? 2 : 0 });
    await writeIndex(root, index);
    const response = await fetchProvider(provider, url, key, fetchImpl);
    const normalized = provider === 'balldontlie' ? normalizeGames(response.payload, response.observedAt) : normalizeOdds(response.payload, response.observedAt);
    const id = randomUUID();
    const metadata = {
      id, provider, observedAt: response.observedAt, source: response.source,
      query: provider === 'balldontlie' ? { season, cursor: cursor ?? null, perPage: 100, ...(startDate ? { startDate, endDate } : {}) } : { region: 'us', books: ['FanDuel', 'DraftKings', 'BetMGM'], markets: ['Moneyline', 'Spread'] },
      payloadSha256: response.payloadSha256, payloadRedacted: response.payloadRedacted,
      quota: response.safeHeaders, records: normalized.games?.length ?? normalized.quotes?.length ?? 0,
      nextCursor: normalized.nextCursor ?? null,
      paginationExhausted: provider === 'balldontlie' ? normalized.paginationExhausted : null,
      // A page or exhausted cursor does not independently establish season coverage.
      complete: false,
      booksPresent: normalized.booksPresent ?? [], geographyVerified: false,
      state: 'API response validated; no betting qualification; Michigan prices unverified',
    };
    const snapshotDir = join(dataDir, 'snapshots', provider); await mkdir(snapshotDir, { recursive: true, mode: 0o700 });
    await writeFile(join(snapshotDir, `${id}.json`), JSON.stringify({ metadata, raw: response.payload, normalized }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    index.collections.push(metadata); await writeIndex(root, index);
    return metadata;
  } finally {
    await lock.close();
    const { unlink } = await import('node:fs/promises'); await unlink(join(dataDir, '.collection-lock'));
  }
}
export async function dataStatus(root = ROOT, environment = process.env) {
  let keys = {}, keyFileError = false, indexError = false;
  try { keys = await readKeys(root, environment); } catch { keyFileError = true; }
  let index;
  try { index = await readIndex(root); } catch { index = { collections: [] }; indexError = true; }
  const provider = (name, keyName) => {
    const latest = index.collections.filter(c => c.provider === name).at(-1);
    return {
      keyConfigured: Boolean(keys[keyName]),
      lastCollection: latest ? {
        observedAt: typeof latest.observedAt === 'string' && Number.isFinite(Date.parse(latest.observedAt)) ? latest.observedAt : null,
        records: Number.isSafeInteger(latest.records) ? latest.records : null,
        complete: latest.complete === true, paginationPending: latest.nextCursor != null,
        booksPresent: Array.isArray(latest.booksPresent) ? latest.booksPresent.filter(b => ['FanDuel','DraftKings','BetMGM'].includes(b)) : [],
      } : null,
    };
  };
  const research=await researchStatus(root);
  return { keyFileError, indexError, balldontlie: provider('balldontlie','BALLDONTLIE_API_KEY'), oddsapi: provider('oddsapi','ODDS_API_KEY'), model: research.state, michiganPrices: 'Unverified', scheduled: false, bet365: 'Deferred' };
}
