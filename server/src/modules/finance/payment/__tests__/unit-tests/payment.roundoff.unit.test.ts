import { chargedRoundOff, roundOffOf, roundUpBill } from '../../payment.roundoff';

describe('roundUpBill', () => {
  it.each([
    // [bill, rounded, round_off]
    [101.47, 102, 0.53],
    [499.5, 500, 0.5],
    [0.01, 1, 0.99],
    [359.1, 360, 0.9],
    [1179.99, 1180, 0.01],
  ])('rounds ₹%p up to ₹%p and records ₹%p', (bill, rounded, roundOff) => {
    expect(roundUpBill(bill)).toEqual({ rounded, round_off: roundOff });
  });

  it.each([0, 1, 118, 1180, 25000])('adds nothing to a bill of ₹%p that is already whole', (bill) => {
    expect(roundUpBill(bill)).toEqual({ rounded: bill, round_off: 0 });
  });

  it('does not let float residue tip a whole amount over to the next rupee', () => {
    // 0.1 + 0.2 style residue: 118.00000000000001 is ₹118, not ₹119.
    expect(roundUpBill(118.00000000000001)).toEqual({ rounded: 118, round_off: 0 });
    expect(roundUpBill(359.1 - 0.1)).toEqual({ rounded: 359, round_off: 0 });
  });

  it('always rounds UP, never to the nearest rupee', () => {
    expect(roundUpBill(100.01)).toEqual({ rounded: 101, round_off: 0.99 });
    expect(roundUpBill(100.49).rounded).toBe(101);
  });

  it('keeps the round-off under one rupee and the parts adding back to the whole', () => {
    for (const bill of [0.5, 12.34, 77.77, 999.99, 4321.05]) {
      const { rounded, round_off: roundOff } = roundUpBill(bill);
      expect(roundOff).toBeGreaterThanOrEqual(0);
      expect(roundOff).toBeLessThan(1);
      expect(Math.round((bill + roundOff) * 100)).toBe(rounded * 100);
    }
  });

  it('treats a negative or unusable amount as nothing to charge', () => {
    expect(roundUpBill(-12.5)).toEqual({ rounded: 0, round_off: 0 });
    expect(roundUpBill(Number.NaN)).toEqual({ rounded: 0, round_off: 0 });
  });
});

describe('roundOffOf', () => {
  it('reads the stored round-off', () => {
    expect(roundOffOf({ total: 102, round_off: 0.53 })).toBe(0.53);
  });

  it('reads a payment taken before the rule existed as zero', () => {
    expect(roundOffOf({ total: 101.47 })).toBe(0);
    expect(roundOffOf({ total: 101.47, round_off: null })).toBe(0);
  });

  it('never answers a negative figure', () => {
    expect(roundOffOf({ total: 10, round_off: -0.4 })).toBe(0);
  });
});

describe('chargedRoundOff', () => {
  it('is the round-off while anything was charged', () => {
    expect(chargedRoundOff({ total: 42, round_off: 0.53 })).toBe(0.53);
  });

  it('is zero when coins cleared the whole bill — the round-off went in coins', () => {
    expect(chargedRoundOff({ total: 0, round_off: 0.53 })).toBe(0);
  });

  it('is zero for a payment with no round-off', () => {
    expect(chargedRoundOff({ total: 500 })).toBe(0);
  });
});
