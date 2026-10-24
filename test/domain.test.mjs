import test from 'node:test';
import assert from 'node:assert/strict';
import { decimalOdds, validateBet, netProfit, summarize } from '../public/domain.mjs';
const example = { game: 'Away at Home', selection: 'Home', placedAt: '2026-10-24T12:00:00Z', book: 'FanDuel', market: 'Moneyline', odds: -110, stake: 10 };
test('American odds conversion and invalid prices', () => {
  assert.equal(decimalOdds(150), 2.5);
  assert.ok(Math.abs(decimalOdds(-110) - 1.909090909) < 1e-8);
  for (const value of [0, 99, -99, '', NaN, Infinity, 110.5]) assert.throws(() => decimalOdds(value));
});
test('spread is required and zero is a valid line', () => {
  assert.throws(() => validateBet({ ...example, market: 'Spread', line: '' }));
  assert.equal(validateBet({ ...example, market: 'Spread', line: 0 }).line, 0);
  assert.throws(() => validateBet({ ...example, market: 'Spread', line: 3.2 }));
});
test('reject invalid stake, book, result and timezone', () => {
  for (const patch of [{ stake: 0 }, { stake: -1 }, { stake: 1.001 }, { stake: 'bad' }, { book: 'Unknown' }, { result: 'Won' }, { placedAt: '2026-10-24T12:00:00' }, { game: '' }]) {
    assert.throws(() => validateBet({ ...example, ...patch }));
  }
});
test('net returns distinguish open, win, loss, push and void', () => {
  assert.equal(netProfit({ ...example, odds: 150, result: 'Win' }), 15);
  assert.equal(netProfit({ ...example, result: 'Loss' }), -10);
  assert.equal(netProfit({ ...example, result: 'Push' }), 0);
  assert.equal(netProfit({ ...example, result: 'Void' }), 0);
  assert.equal(netProfit({ ...example, result: 'Open' }), null);
});
test('flat-stake accounting is separate from actual stakes', () => {
  const summary = summarize([
    { ...example, stake: 20, odds: 150, result: 'Win' },
    { ...example, stake: 10, result: 'Loss' },
    { ...example, stake: 5, result: 'Push' },
    { ...example, stake: 100, result: 'Void' },
    { ...example, stake: 1000, result: 'Open' },
  ]);
  assert.equal(summary.profit, 20);
  assert.equal(summary.risked, 35);
  assert.equal(summary.unitProfit, .5);
  assert.equal(summary.roi, 20 / 35);
  assert.equal(summary.settled, 4);
  assert.equal(summarize([]).roi, null);
});
