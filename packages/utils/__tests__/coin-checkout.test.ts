import { describe, expect, it } from 'vitest';
import { coinCheckoutSummary, coinsForSpend, type CoinCheckoutSummary } from '../src/coin-checkout';

/** A bill with only the figures under test set deliberately. */
const bill = (over: Partial<Parameters<typeof coinCheckoutSummary>[0]> = {}) =>
  coinCheckoutSummary({ balance: 0, applied: 0, payable: 0, earnPct: 0, ...over });

describe('coinsForSpend', () => {
  it('grants the configured percentage of the spend as coins', () => {
    expect(coinsForSpend(1000, 5)).toBe(50);
    expect(coinsForSpend(200, 10)).toBe(20);
  });

  // 1 coin = 1 rupee: a fractional coin is a fraction of a rupee nobody can
  // spend, so the grant floors rather than rounds (₹999 at 5% is 49.95 → 49).
  it('floors a fractional grant instead of rounding it up', () => {
    expect(coinsForSpend(999, 5)).toBe(49);
    expect(coinsForSpend(19, 5)).toBe(0);
  });

  it('grants nothing when the spend is zero or negative', () => {
    expect(coinsForSpend(0, 5)).toBe(0);
    expect(coinsForSpend(-500, 5)).toBe(0);
  });

  it('grants nothing when the earn rate is zero or negative', () => {
    expect(coinsForSpend(1000, 0)).toBe(0);
    expect(coinsForSpend(1000, -5)).toBe(0);
  });

  // A missing or malformed figure from the API must read as "no coins", never
  // as NaN leaking into a bill.
  it('treats a non-numeric spend or rate as zero', () => {
    expect(coinsForSpend(Number.NaN, 5)).toBe(0);
    expect(coinsForSpend(1000, Number.NaN)).toBe(0);
    expect(coinsForSpend('abc' as unknown as number, 5)).toBe(0);
    expect(coinsForSpend(null as unknown as number, 5)).toBe(0);
    expect(coinsForSpend(1000, undefined as unknown as number)).toBe(0);
  });

  it('coerces numeric strings the way the server does', () => {
    expect(coinsForSpend('1000' as unknown as number, '5' as unknown as number)).toBe(50);
  });
});

describe('coinCheckoutSummary', () => {
  it('reports what is spent, what is left and what is earned on one bill', () => {
    const summary: CoinCheckoutSummary = bill({ balance: 500, applied: 200, payable: 800, earnPct: 5 });
    expect(summary).toEqual({ used: 200, remaining: 300, earning: 40, hasAny: true });
  });

  // The earn preview must be computed off the DISCOUNTED figure the server
  // actually charges: the caller passes `payable` already net of coupon and
  // coins, and the summary takes it at face value. A ₹1000 bill with 200 coins
  // applied is payable ₹800 → 40 coins at 5%; neither the 50 the gross would
  // promise (and the server never grants) nor a double-discounted 30 from
  // taking the applied coins off again.
  it('previews the earn on the payable it is given, without adding coins back or taking them off again', () => {
    const summary = bill({ balance: 500, applied: 200, payable: 800, earnPct: 5 });
    expect(summary.used).toBe(200);
    expect(summary.earning).toBe(40);
  });

  it('uses the rate the caller passes, since pod tickets and shop orders earn differently', () => {
    expect(bill({ payable: 1000, earnPct: 5 }).earning).toBe(50);
    expect(bill({ payable: 1000, earnPct: 2 }).earning).toBe(20);
  });

  it('never spends more coins than the buyer holds', () => {
    expect(bill({ balance: 100, applied: 250 })).toMatchObject({ used: 100, remaining: 0 });
  });

  // Applying coins against an empty balance is not a spend: nothing is used,
  // nothing is left, and there is nothing worth showing — the raw `applied`
  // figure must never leak into `hasAny`.
  it('counts coins applied against an empty balance as nothing at all', () => {
    expect(bill({ balance: 0, applied: 50 })).toEqual({
      used: 0,
      remaining: 0,
      earning: 0,
      hasAny: false,
    });
  });

  it('leaves the whole balance untouched when no coins are applied', () => {
    expect(bill({ balance: 300, applied: 0 })).toMatchObject({ used: 0, remaining: 300 });
  });

  it('never lets a negative application add coins to the balance', () => {
    expect(bill({ balance: 300, applied: -50 })).toMatchObject({ used: 0, remaining: 300 });
  });

  it('treats a negative balance as empty rather than going below zero', () => {
    expect(bill({ balance: -40, applied: 10 })).toMatchObject({ used: 0, remaining: 0 });
  });

  it('floors fractional balances and applications to whole coins', () => {
    expect(bill({ balance: 100.9, applied: 40.7 })).toMatchObject({ used: 40, remaining: 60 });
  });

  it('reads a missing or malformed balance or application as zero coins', () => {
    expect(bill({ balance: Number.NaN, applied: Number.NaN })).toMatchObject({ used: 0, remaining: 0 });
    expect(
      bill({ balance: undefined as unknown as number, applied: null as unknown as number }),
    ).toMatchObject({ used: 0, remaining: 0 });
  });

  describe('hasAny', () => {
    // A buyer who spends their ENTIRE balance has nothing left and (at a 0%
    // rate) earns nothing back, yet the "coins used" line is the most important
    // one on the bill — so `hasAny` keys off what was spent, not what remains.
    it('is true when the whole balance is spent, leaving nothing and earning nothing', () => {
      expect(bill({ balance: 50, applied: 50, payable: 1000, earnPct: 0 })).toEqual({
        used: 50,
        remaining: 0,
        earning: 0,
        hasAny: true,
      });
    });

    it('is true when nothing is spent but the purchase earns coins', () => {
      expect(bill({ balance: 0, applied: 0, payable: 1000, earnPct: 5 }).hasAny).toBe(true);
    });

    // A buyer holding coins they chose not to apply still has something worth
    // seeing: the balance that will carry over.
    it('is true when nothing is spent or earned but the buyer holds a balance', () => {
      expect(bill({ balance: 120, applied: 0, payable: 1000, earnPct: 0 }).hasAny).toBe(true);
    });

    it('is false when there are no coins to spend, hold or earn', () => {
      expect(bill({ balance: 0, applied: 0, payable: 1000, earnPct: 0 }).hasAny).toBe(false);
    });
  });
});
