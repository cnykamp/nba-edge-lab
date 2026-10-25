import { createHash } from 'node:crypto';

export const BOOK_KEYS = Object.freeze({ fanduel: 'FanDuel', draftkings: 'DraftKings', betmgm: 'BetMGM' });
export const PROVIDERS = Object.freeze({
  balldontlie: { host: 'api.balldontlie.io', keyName: 'BALLDONTLIE_API_KEY' },
  oddsapi: { host: 'api.the-odds-api.com', keyName: 'ODDS_API_KEY' },
});
export class CollectionError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
function fail(message) { throw new CollectionError('INVALID_RESPONSE', message); }
function validTime(value) { return typeof value === 'string' && /(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)); }
export function gamesRequest(season, cursor) {
  if (!Number.isInteger(season) || season < 1946 || season > new Date().getUTCFullYear()) throw new CollectionError('INVALID_ARGUMENT', 'Choose a valid NBA season start year.');
  const url = new URL('https://api.balldontlie.io/v1/games');
  url.searchParams.set('seasons[]', String(season));
  url.searchParams.set('per_page', '100');
  if (cursor != null) {
    if (!Number.isSafeInteger(cursor) || cursor < 0) throw new CollectionError('INVALID_ARGUMENT', 'Cursor must be a nonnegative integer.');
    url.searchParams.set('cursor', String(cursor));
  }
  return url;
}
export function oddsRequest() {
  const url = new URL('https://api.the-odds-api.com/v4/sports/basketball_nba/odds');
  url.searchParams.set('regions', 'us');
  url.searchParams.set('bookmakers', Object.keys(BOOK_KEYS).join(','));
  url.searchParams.set('markets', 'h2h,spreads');
  url.searchParams.set('oddsFormat', 'american');
  url.searchParams.set('dateFormat', 'iso');
  return url;
}
export function normalizeGames(payload, observedAt) {
  if (!Array.isArray(payload?.data) || !payload.meta || !validTime(observedAt)) fail('Unexpected game response.');
  const seen = new Set();
  const games = payload.data.map(game => {
    if (!Number.isSafeInteger(game.id) || seen.has(game.id) || !game.home_team?.full_name || !game.visitor_team?.full_name || !Number.isInteger(game.season)) fail('Incomplete or duplicate game record.');
    seen.add(game.id);
    const status = game.status_state ?? (game.status === 'Final' ? 'final' : 'unknown');
    const final = status === 'final';
    if (final && (![game.home_team_score, game.visitor_team_score].every(n => Number.isInteger(n) && n >= 0) || game.home_team_score === game.visitor_team_score)) fail('Invalid final NBA score.');
    return {
      providerGameId: String(game.id), season: game.season,
      gameDate: typeof game.date === 'string' ? game.date.slice(0, 10) : null,
      scheduledStart: validTime(game.datetime) ? game.datetime : null,
      home: game.home_team.full_name, away: game.visitor_team.full_name,
      homeTeamId: game.home_team.id ?? null, awayTeamId: game.visitor_team.id ?? null,
      status, homeScore: final ? game.home_team_score : null, awayScore: final ? game.visitor_team_score : null,
      postseason: typeof game.postseason === 'boolean' ? game.postseason : null,
      seasonType: game.season_type ?? null, observedAt,
      historicalAvailability: 'Historical final-score timing is unverified; observedAt is the retrieval time, not a backdated availability claim.',
    };
  });
  const nextCursor = payload.meta.next_cursor ?? null;
  if (nextCursor !== null && (!Number.isSafeInteger(nextCursor) || nextCursor < 0)) fail('Unexpected pagination cursor.');
  return { games, nextCursor, paginationExhausted: nextCursor === null };
}
export function normalizeOdds(payload, observedAt) {
  if (!Array.isArray(payload) || !validTime(observedAt)) fail('Unexpected odds response.');
  const quotes = [];
  let skipped = 0;
  const seen = new Set();
  for (const game of payload) {
    if (typeof game.id !== 'string' || seen.has(game.id) || !validTime(game.commence_time) || !game.home_team || !game.away_team || !Array.isArray(game.bookmakers)) fail('Incomplete or duplicate odds event.');
    seen.add(game.id);
    // Upcoming-only research: never disguise an in-play quote as pregame.
    if (Date.parse(game.commence_time) <= Date.parse(observedAt)) { skipped++; continue; }
    for (const book of game.bookmakers) {
      if (!Object.hasOwn(BOOK_KEYS, book.key)) { skipped++; continue; }
      if (!Array.isArray(book.markets)) fail('Incomplete bookmaker response.');
      for (const market of book.markets) {
        if (!['h2h', 'spreads'].includes(market.key)) continue;
        if (!Array.isArray(market.outcomes) || market.outcomes.length !== 2) fail('A supported NBA market must have exactly two sides.');
        const names = market.outcomes.map(o => o.name);
        if (!names.includes(game.home_team) || !names.includes(game.away_team)) fail('Market sides do not match the game.');
        if (market.key === 'spreads' && (!market.outcomes.every(o => typeof o.point === 'number' && Number.isFinite(o.point) && Number.isInteger(o.point * 2)) || Math.abs(market.outcomes[0].point + market.outcomes[1].point) > 1e-9)) fail('Spread lines are missing or mismatched.');
        const sourceUpdatedAt = market.last_update ?? book.last_update;
        if (!validTime(sourceUpdatedAt) || Date.parse(sourceUpdatedAt) > Date.parse(observedAt)) fail('Missing or future-dated quote timestamp.');
        for (const side of market.outcomes) {
          if (!Number.isInteger(side.price) || Math.abs(side.price) < 100) fail('Invalid American odds.');
          quotes.push({
            providerGameId: game.id, home: game.home_team, away: game.away_team,
            scheduledStart: game.commence_time, book: BOOK_KEYS[book.key],
            market: market.key === 'h2h' ? 'Moneyline' : 'Spread', selection: side.name,
            line: market.key === 'spreads' ? side.point : null, americanOdds: side.price,
            sourceUpdatedAt, observedAt, ageSeconds: Math.floor((Date.parse(observedAt) - Date.parse(sourceUpdatedAt)) / 1000),
            geography: 'US feed; Michigan equivalence unverified',
            qualification: 'Research only; no model or freshness threshold validated',
          });
        }
      }
    }
  }
  return { quotes, skipped, returnedEvents: payload.length, booksPresent: [...new Set(quotes.map(q => q.book))] };
}
export async function fetchProvider(provider, requestUrl, key, fetchImpl = fetch) {
  const settings = PROVIDERS[provider];
  const url = new URL(requestUrl);
  if (!settings || url.protocol !== 'https:' || url.hostname !== settings.host || url.username || url.password) throw new CollectionError('INVALID_ARGUMENT', 'Provider endpoint is not allowed.');
  if (typeof key !== 'string' || !/^[A-Za-z0-9._-]{8,512}$/.test(key)) throw new CollectionError('MISSING_KEY', 'A valid local API key is required. Run npm run setup:keys.');
  const headers = { Accept: 'application/json' };
  // The Odds API documents query authentication; this URL must never reach logs or disk.
  if (provider === 'oddsapi') url.searchParams.set('apiKey', key);
  else headers.Authorization = key;
  let response;
  try { response = await fetchImpl(url, { headers, redirect: 'error', signal: AbortSignal.timeout(20000) }); }
  catch { throw new CollectionError('NETWORK_ERROR', 'Provider request failed or timed out. No automatic retry was made.'); }
  if (!response.ok) {
    const code = response.status === 429 ? 'RATE_LIMITED' : [401, 403].includes(response.status) ? 'ACCESS_DENIED' : 'PROVIDER_ERROR';
    // Do not forward provider error text, URLs, headers, or causes: they can echo keys.
    throw new CollectionError(code, `Provider returned HTTP ${response.status}. Check your free-plan access; no automatic retry was made.`);
  }
  const chunks = []; let size = 0;
  try {
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      if (size > 8 * 1024 * 1024) { await response.body.cancel().catch(() => {}); throw new Error('too large'); }
      chunks.push(Buffer.from(chunk));
    }
  } catch { throw new CollectionError('INVALID_RESPONSE', 'Provider response could not be read within the size limit.'); }
  const raw = Buffer.concat(chunks).toString('utf8');
  const sanitized = raw.split(key).join('[REDACTED]');
  let payload;
  try { payload = JSON.parse(sanitized); } catch { fail('Provider did not return valid JSON.'); }
  const safeHeaders = {};
  for (const name of ['x-requests-remaining', 'x-requests-used', 'x-requests-last']) {
    const value = response.headers.get(name);
    if (value != null && /^\d+$/.test(value)) safeHeaders[name] = Number(value);
  }
  const observedAt = new Date().toISOString();
  return {
    payload, observedAt, safeHeaders,
    source: `${url.origin}${url.pathname}`,
    payloadSha256: createHash('sha256').update(sanitized).digest('hex'),
    payloadRedacted: sanitized !== raw,
  };
}
