import { coinsForBackoutRefund, coinsForSpend } from '../../coin.service';

/**
 * The two pure coin formulas. 1 coin = 1 rupee, so both floor to a whole coin:
 * rounding up would give away value nobody paid for.
 */

describe('coinsForSpend', () => {
  it.each([
    [1000, 10, 100],
    [999, 5, 49], // 49.95 floors to 49
    [19, 5, 0], // 0.95 — less than one whole coin earns nothing
    [20, 5, 1],
    [1000, 100, 1000],
  ])('spend %p at %p%% earns %p coins', (spend, pct, coins) => {
    expect(coinsForSpend(spend, pct)).toBe(coins);
  });

  it('earns nothing on a zero/negative spend or rate, or on non-numeric input', () => {
    expect(coinsForSpend(0, 10)).toBe(0);
    expect(coinsForSpend(-500, 10)).toBe(0);
    expect(coinsForSpend(500, 0)).toBe(0);
    expect(coinsForSpend(500, -5)).toBe(0);
    expect(coinsForSpend(Number.NaN, 10)).toBe(0);
    expect(coinsForSpend('abc' as unknown as number, 10)).toBe(0);
  });

  it('accepts numeric strings as the numbers they spell', () => {
    expect(coinsForSpend('1000' as unknown as number, '10' as unknown as number)).toBe(100);
  });
});

describe('coinsForBackoutRefund', () => {
  const refund = (over: Partial<Parameters<typeof coinsForBackoutRefund>[0]>) =>
    coinsForBackoutRefund({ coinsPaid: 100, releaseSeats: 1, paidSeats: 2, deductionPct: 10, ...over });

  it('prorates by seats released over seats paid, then takes the backout deduction', () => {
    // 100 * 1/2 = 50, less 10% = 45
    expect(refund({})).toBe(45);
  });

  it('a full release with no deduction gives back every coin', () => {
    expect(refund({ releaseSeats: 2, deductionPct: 0 })).toBe(100);
  });

  it('never releases more seats than the payment covered', () => {
    expect(refund({ releaseSeats: 5 })).toBe(90);
  });

  it('floors the fractional coin rather than rounding up', () => {
    // 7 * 1/2 = 3.5 -> 3; 9 * 1/2 = 4.5, less 10% = 4.05 -> 4
    expect(refund({ coinsPaid: 7, deductionPct: 0 })).toBe(3);
    expect(refund({ coinsPaid: 9 })).toBe(4);
  });

  it('floors a fractional coinsPaid before prorating', () => {
    expect(refund({ coinsPaid: 10.9, releaseSeats: 1, paidSeats: 1, deductionPct: 0 })).toBe(10);
  });

  it('clamps the deduction to 0..100', () => {
    expect(refund({ deductionPct: 150 })).toBe(0);
    expect(refund({ deductionPct: -20 })).toBe(50);
    expect(refund({ deductionPct: Number.NaN })).toBe(50);
  });

  it('treats zero or missing paid seats as one seat', () => {
    expect(refund({ paidSeats: 0, deductionPct: 0 })).toBe(100);
  });

  it('returns 0 when nothing was paid in coins or no seat is released', () => {
    expect(refund({ coinsPaid: 0 })).toBe(0);
    expect(refund({ coinsPaid: -5 })).toBe(0);
    expect(refund({ releaseSeats: 0 })).toBe(0);
    expect(refund({ releaseSeats: -1 })).toBe(0);
  });
});
