import { buildBreakup, formatMoney, inclusiveGst } from '@/utils/checkout-math';

describe('buildBreakup', () => {
  it('returns null without settings', () => {
    expect(buildBreakup(100, null)).toBeNull();
  });

  it('extracts inclusive GST so taxable value + gst equals the total', () => {
    const b = buildBreakup(118, { platform_fee_pct: 0, gst_pct: 18, currency_symbol: '₹' })!;
    expect(b.total).toBe(118);
    expect(b.currency).toBe('₹');
    expect(b.feePct).toBe(0);
    expect(b.gstPct).toBe(18);
    expect(b.subtotal).toBeCloseTo(100, 2);
    expect(b.gst).toBeCloseTo(18, 2);
    expect(b.subtotal + b.gst).toBeCloseTo(118, 2);
  });

  it('takes the platform fee from the net (memo, not added to the total)', () => {
    const b = buildBreakup(1000, { platform_fee_pct: 5, gst_pct: 18, currency_symbol: '$' })!;
    // gst 152.54 → net (taxable value) 847.46 → fee 847.46×5% = 42.37.
    expect(b.gst).toBeCloseTo(152.54, 2);
    expect(b.subtotal).toBeCloseTo(847.46, 2);
    expect(b.fee).toBeCloseTo(42.37, 2);
    expect(b.subtotal + b.gst).toBeCloseTo(1000, 2);
  });

  it('treats a non-numeric amount as zero', () => {
    const b = buildBreakup(Number('x'), {
      platform_fee_pct: 10,
      gst_pct: 5,
      currency_symbol: '₹',
    })!;
    expect(b.total).toBe(0);
    expect(b.gst).toBe(0);
  });
});

describe('inclusiveGst', () => {
  it('extracts GST from a GST-inclusive total', () => {
    expect(inclusiveGst(1000, 18)).toBeCloseTo(152.54, 2);
  });

  it('treats non-numeric inputs as zero', () => {
    expect(inclusiveGst(Number('x'), 18)).toBe(0);
    expect(inclusiveGst(1000, Number('x'))).toBe(0);
  });
});

describe('formatMoney', () => {
  it('prefixes the currency and uses two decimals', () => {
    expect(formatMoney('₹', 12)).toBe('₹12.00');
    expect(formatMoney('$', 9.5)).toBe('$9.50');
  });
});
