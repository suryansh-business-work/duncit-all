import { buildBreakup, formatMoney } from '@/utils/checkout-math';

describe('buildBreakup', () => {
  it('returns null without settings', () => {
    expect(buildBreakup(100, null)).toBeNull();
  });

  it('splits an inclusive gross into subtotal + fee + gst summing to the total', () => {
    const b = buildBreakup(118, { platform_fee_pct: 0, gst_pct: 18, currency_symbol: '₹' })!;
    expect(b.total).toBe(118);
    expect(b.currency).toBe('₹');
    expect(b.feePct).toBe(0);
    expect(b.gstPct).toBe(18);
    expect(b.subtotal).toBeCloseTo(100, 5);
    expect(b.gst).toBeCloseTo(18, 5);
    expect(b.subtotal + b.fee + b.gst).toBeCloseTo(118, 5);
  });

  it('handles a fee + gst combination', () => {
    const b = buildBreakup(100, { platform_fee_pct: 10, gst_pct: 18, currency_symbol: '$' })!;
    expect(b.subtotal + b.fee + b.gst).toBeCloseTo(100, 5);
    expect(b.fee).toBeGreaterThan(0);
  });

  it('treats a non-numeric amount as zero', () => {
    const b = buildBreakup(Number('x'), {
      platform_fee_pct: 10,
      gst_pct: 5,
      currency_symbol: '₹',
    })!;
    expect(b.total).toBe(0);
  });

  it('falls back to the gross when the divisor collapses to zero', () => {
    // platform_fee_pct = -100 → feeRate = -1 → divisor = 0, so subtotal = gross.
    const b = buildBreakup(100, { platform_fee_pct: -100, gst_pct: 18, currency_symbol: '₹' })!;
    expect(b.subtotal).toBe(100);
    expect(b.total).toBe(100);
  });
});

describe('formatMoney', () => {
  it('prefixes the currency and uses two decimals', () => {
    expect(formatMoney('₹', 12)).toBe('₹12.00');
    expect(formatMoney('$', 9.5)).toBe('$9.50');
  });
});
