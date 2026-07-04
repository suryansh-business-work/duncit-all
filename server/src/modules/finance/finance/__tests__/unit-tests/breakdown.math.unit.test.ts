import {
  assertValidRates,
  computePodFinanceBreakdown,
  type BreakdownRates,
} from '../../breakdown.math';

const DEFAULT_RATES: BreakdownRates = {
  gst_percent: 18,
  platform_fee_percent: 5,
  host_commission_percent: 10,
  venue_commission_percent: 10,
};

const invariant = (
  amountPaise: number,
  venueAmountPaise = 0,
  rates: BreakdownRates = DEFAULT_RATES
) => {
  const b = computePodFinanceBreakdown(amountPaise, venueAmountPaise, rates);
  expect(b.gst_paise + b.host_receives_paise + b.venue_receives_paise + b.duncit_revenue_paise).toBe(
    amountPaise
  );
  // The pool always splits exactly between venue amount and host remainder.
  expect(b.venue_amount_paise + b.host_amount_paise).toBe(b.pool_paise);
  return b;
};

describe('computePodFinanceBreakdown', () => {
  it('matches the canonical ₹1000 + ₹300 venue-slot vector to the paisa', () => {
    const b = computePodFinanceBreakdown(100000, 30000, DEFAULT_RATES);
    expect(b.gst_paise).toBe(15254); // 1000 × 18/118 = 152.54
    expect(b.net_paise).toBe(84746);
    expect(b.platform_fee_paise).toBe(4237); // 847.46 × 5% = 42.37
    expect(b.pool_paise).toBe(80509);
    expect(b.venue_amount_paise).toBe(30000); // fixed slot price (partners portal)
    expect(b.venue_commission_paise).toBe(3000); // 10%
    expect(b.venue_receives_paise).toBe(27000); // 270.00
    expect(b.host_amount_paise).toBe(50509); // the remainder is the host's
    expect(b.host_commission_paise).toBe(5051); // 505.09 × 10% = 50.51
    expect(b.host_receives_paise).toBe(45458); // 454.58
    expect(b.duncit_revenue_paise).toBe(12288); // 42.37 + 50.51 + 30.00 = 122.88
    expect(b.host_earn_percent).toBe(45.46);
    expect(b.rates).toEqual(DEFAULT_RATES);
    // Reconciliation invariant.
    expect(b.gst_paise + b.host_receives_paise + b.venue_receives_paise + b.duncit_revenue_paise).toBe(
      100000
    );
  });

  it('gives the host the whole pool when there is no venue', () => {
    const b = invariant(100000, 0);
    expect(b.venue_amount_paise).toBe(0);
    expect(b.venue_receives_paise).toBe(0);
    expect(b.host_amount_paise).toBe(b.pool_paise); // 805.09
    expect(b.host_commission_paise).toBe(8051);
    expect(b.host_receives_paise).toBe(72458); // 724.58
    expect(b.duncit_revenue_paise).toBe(12288);
  });

  it('clamps a venue price larger than the pool (host gets 0, never negative)', () => {
    const b = invariant(100000, 500000); // slot price ≫ pool
    expect(b.venue_amount_paise).toBe(b.pool_paise); // clamped to 805.09
    expect(b.host_amount_paise).toBe(0);
    expect(b.host_receives_paise).toBe(0);
    expect(b.host_commission_paise).toBe(0);
    expect(b.host_earn_percent).toBe(0);
  });

  it('returns all-zero lines for a free (100%-coupon) pod', () => {
    const b = invariant(0, 30000);
    expect(b.venue_amount_paise).toBe(0); // clamped to the empty pool
    expect(b.host_receives_paise).toBe(0);
    expect(b.duncit_revenue_paise).toBe(0);
    expect(b.host_earn_percent).toBe(0);
  });

  it('supports fully dynamic rates (0% GST, 0% fee, 0% commissions)', () => {
    const b = invariant(99999, 33333, {
      gst_percent: 0,
      platform_fee_percent: 0,
      host_commission_percent: 0,
      venue_commission_percent: 0,
    });
    expect(b.gst_paise).toBe(0);
    expect(b.platform_fee_paise).toBe(0);
    expect(b.pool_paise).toBe(99999);
    expect(b.venue_receives_paise).toBe(33333); // full price, no commission
    expect(b.host_receives_paise).toBe(66666);
    expect(b.duncit_revenue_paise).toBe(0);
  });

  it('holds the reconciliation invariant across awkward amounts, venue prices, and decimal rates', () => {
    const amounts = [1, 2, 3, 99, 101, 33333, 99999, 100001, 123456789];
    const venueAmounts = [0, 1, 99, 12345, 99999999];
    const rateSets: BreakdownRates[] = [
      DEFAULT_RATES,
      { ...DEFAULT_RATES, gst_percent: 12, platform_fee_percent: 2.5 },
      { ...DEFAULT_RATES, host_commission_percent: 12.5, venue_commission_percent: 7.5 },
      {
        gst_percent: 28,
        platform_fee_percent: 100,
        host_commission_percent: 100,
        venue_commission_percent: 100,
      },
    ];
    for (const rates of rateSets) {
      for (const amount of amounts) {
        for (const venueAmount of venueAmounts) {
          invariant(amount, venueAmount, rates);
        }
      }
    }
  });

  it('rejects a non-integer or negative amount and venue amount', () => {
    expect(() => computePodFinanceBreakdown(100.5, 0, DEFAULT_RATES)).toThrow(/amount_paise/);
    expect(() => computePodFinanceBreakdown(-1, 0, DEFAULT_RATES)).toThrow(/amount_paise/);
    expect(() => computePodFinanceBreakdown(1000, 0.5, DEFAULT_RATES)).toThrow(/venue_amount_paise/);
    expect(() => computePodFinanceBreakdown(1000, -1, DEFAULT_RATES)).toThrow(/venue_amount_paise/);
  });
});

describe('assertValidRates', () => {
  it('accepts the default rate set', () => {
    expect(() => assertValidRates(DEFAULT_RATES)).not.toThrow();
  });

  it('rejects out-of-range, non-finite, and missing rates', () => {
    expect(() => assertValidRates({ ...DEFAULT_RATES, gst_percent: -1 })).toThrow(/gst_percent/);
    expect(() => assertValidRates({ ...DEFAULT_RATES, platform_fee_percent: 101 })).toThrow(
      /platform_fee_percent/
    );
    expect(() => assertValidRates({ ...DEFAULT_RATES, host_commission_percent: Number.NaN })).toThrow(
      /host_commission_percent/
    );
    expect(() =>
      assertValidRates({ ...DEFAULT_RATES, venue_commission_percent: undefined as unknown as number })
    ).toThrow(/venue_commission_percent/);
  });
});
