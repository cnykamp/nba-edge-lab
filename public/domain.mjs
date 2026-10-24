export const BOOKS = ['FanDuel', 'DraftKings', 'BetMGM', 'bet365'];
export const MARKETS = ['Moneyline', 'Spread'];
export const RESULTS = ['Open', 'Win', 'Loss', 'Push', 'Void'];

export function decimalOdds(american) {
  const n = Number(american);
  if (!Number.isFinite(n) || !Number.isInteger(n) || Math.abs(n) < 100) {
    throw new Error('Enter American odds of +100 or higher, or −100 or lower.');
  }
  return n > 0 ? 1 + n / 100 : 1 + 100 / Math.abs(n);
}
export function validateBet(input) {
  const text = (key, max = 120) => {
    if (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > max) {
      throw new Error(`Enter a valid ${key}.`);
    }
    return input[key].trim();
  };
  const game = text('game');
  const selection = text('selection');
  const placedAt = text('placedAt', 40);
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(placedAt) || !Number.isFinite(Date.parse(placedAt))) {
    throw new Error('Bet time must include its timezone.');
  }
  if (!BOOKS.includes(input.book) || !MARKETS.includes(input.market)) throw new Error('Choose a supported book and market.');
  const odds = Number(input.odds);
  decimalOdds(odds);
  if (input.stake === '' || input.stake == null) throw new Error('Enter a stake.');
  const stake = Number(input.stake);
  if (!Number.isFinite(stake) || stake <= 0 || stake > 1000000 || Math.abs(stake * 100 - Math.round(stake * 100)) > 1e-6) {
    throw new Error('Enter a positive stake with at most two decimal places.');
  }
  let line = null;
  if (input.market === 'Spread') {
    if (input.line == null || String(input.line).trim() === '') throw new Error('Enter the spread for the selected team.');
    line = Number(input.line);
    if (!Number.isFinite(line) || Math.abs(line) > 100 || !Number.isInteger(line * 2)) throw new Error('Enter a spread in half-point increments.');
  }
  const result = input.result ?? 'Open';
  if (!RESULTS.includes(result)) throw new Error('Choose a valid result.');
  return { game, selection, placedAt, book: input.book, market: input.market, odds, stake, line, result };
}
export function netProfit(bet, stake = bet.stake) {
  if (bet.result === 'Open') return null;
  if (bet.result === 'Win') return stake * (decimalOdds(bet.odds) - 1);
  if (bet.result === 'Loss') return -stake;
  if (['Push', 'Void'].includes(bet.result)) return 0;
  throw new Error('Unknown result');
}
export function summarize(bets) {
  const settled = bets.filter(b => b.result !== 'Open');
  // Voids never count as action; pushes do count as settled stakes.
  const action = settled.filter(b => b.result !== 'Void');
  const risked = action.reduce((s, b) => s + b.stake, 0);
  const profit = settled.reduce((s, b) => s + netProfit(b), 0);
  return {
    count: bets.length, settled: settled.length, risked, profit,
    roi: risked ? profit / risked : null,
    unitProfit: settled.reduce((s, b) => s + netProfit(b, 1), 0),
  };
}
