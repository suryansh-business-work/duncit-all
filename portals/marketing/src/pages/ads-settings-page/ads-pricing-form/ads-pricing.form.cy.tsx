import { describe, expect, it } from 'vitest';
import { adsPricingSchema, fromAdPricing, toUpdateAdPricingInput } from './ads-pricing.form';
import { AD_POSITIONS } from '../../../lib/ad-positions';
import type { AdPricing } from './ads-pricing.types';

const pricing: AdPricing = {
  auto_per_day: 500,
  home_bottom_per_day: 750,
  sidebar_per_day: 400,
  explore_scroll_per_day: 350,
  status_per_day: 300,
  venue_list_per_day: 250,
  club_list_per_day: 250,
  pod_list_per_day: 200,
  pod_details_per_day: 200,
  currency_symbol: '₹',
  min_days: 1,
  max_days: 30,
  // The rate-card wording the server resolves its defaults into, one row per
  // placement in AD_POSITIONS order.
  placements: AD_POSITIONS.map((p) => ({
    position: p.position,
    label: p.label,
    note: `${p.label} placement on duncit.com`,
  })),
};

const valid = fromAdPricing(pricing);

// The schema is built per-render from the surface's translator, so every call
// site asks for one rather than importing a ready-made object.
const schema = adsPricingSchema();

const messages = (result: ReturnType<typeof schema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('fromAdPricing', () => {
  it('stringifies prices for the text fields', () => {
    expect(valid.auto_per_day).toBe('500');
    expect(valid.currency_symbol).toBe('₹');
  });

  it('carries the booking window and the rate-card wording', () => {
    expect(valid.min_days).toBe('1');
    expect(valid.max_days).toBe('30');
    expect(valid.placements).toHaveLength(AD_POSITIONS.length);
    expect(valid.placements[1]).toEqual({
      position: 'HOME_BOTTOM',
      label: 'Home Bottom',
      note: 'Home Bottom placement on duncit.com',
    });
  });

  it('leaves wording blank for a placement the server has no copy for', () => {
    const bare = fromAdPricing({ ...pricing, placements: [] });
    expect(bare.placements.map((p) => p.position)).toEqual(AD_POSITIONS.map((p) => p.position));
    expect(bare.placements.every((p) => p.label === '' && p.note === '')).toBe(true);
  });
});

describe('adsPricingSchema', () => {
  it('accepts a valid pricing sheet', () => {
    const parsed = schema.parse(valid);
    expect(parsed.home_bottom_per_day).toBe('750');
  });

  it('requires every per-day price', () => {
    const result = schema.safeParse({ ...valid, pod_list_per_day: '' });
    expect(messages(result)).toMatch(/pod list price is required/i);
  });

  it('rejects a non-numeric price', () => {
    const result = schema.safeParse({ ...valid, home_bottom_per_day: 'abc' });
    expect(messages(result)).toMatch(/must be a number/i);
  });

  it('rejects a negative price', () => {
    const result = schema.safeParse({ ...valid, sidebar_per_day: '-5' });
    expect(messages(result)).toMatch(/cannot be negative/i);
  });

  it('accepts a zero price (free placement)', () => {
    const result = schema.safeParse({ ...valid, status_per_day: '0' });
    expect(result.success).toBe(true);
  });

  it('requires the currency symbol', () => {
    const result = schema.safeParse({ ...valid, currency_symbol: '  ' });
    expect(messages(result)).toMatch(/currency symbol is required/i);
  });

  it('rejects an over-long currency symbol', () => {
    const result = schema.safeParse({ ...valid, currency_symbol: 'RUPEES' });
    expect(messages(result)).toMatch(/at most 4/i);
  });

  it('requires whole booking-window days of at least one', () => {
    expect(messages(schema.safeParse({ ...valid, min_days: '' }))).toMatch(
      /minimum days is required/i,
    );
    expect(messages(schema.safeParse({ ...valid, max_days: '2.5' }))).toMatch(
      /whole number/i,
    );
    expect(messages(schema.safeParse({ ...valid, min_days: '0' }))).toMatch(/at least 1/i);
  });

  // The two ends are a relationship, so the complaint is put on the field that
  // makes the window impossible rather than on whichever was typed second.
  it('refuses a maximum shorter than the minimum, on max_days', () => {
    const result = schema.safeParse({ ...valid, min_days: '10', max_days: '5' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['max_days']);
      expect(result.error.issues[0].message).toMatch(/cannot be shorter than/i);
    }
  });

  it('caps the rate-card wording lengths', () => {
    const long = (n: number) => 'x'.repeat(n);
    const withCopy = (label: string, note: string) => ({
      ...valid,
      placements: valid.placements.map((p, i) => (i === 0 ? { ...p, label, note } : p)),
    });
    expect(messages(schema.safeParse(withCopy(long(81), '')))).toMatch(/at most 80/i);
    expect(messages(schema.safeParse(withCopy('', long(241))))).toMatch(/at most 240/i);
  });
});

describe('toUpdateAdPricingInput', () => {
  it('converts text prices back to numbers', () => {
    const input = toUpdateAdPricingInput({ ...valid, home_bottom_per_day: '899.5' });
    expect(input.home_bottom_per_day).toBe(899.5);
    expect(input.auto_per_day).toBe(500);
  });

  it('trims the currency symbol', () => {
    const input = toUpdateAdPricingInput({ ...valid, currency_symbol: ' $ ' });
    expect(input.currency_symbol).toBe('$');
  });

  it('converts the booking window back to numbers', () => {
    const input = toUpdateAdPricingInput({ ...valid, min_days: '3', max_days: '21' });
    expect(input.min_days).toBe(3);
    expect(input.max_days).toBe(21);
  });

  it('round-trips a pricing sheet unchanged', () => {
    expect(toUpdateAdPricingInput(fromAdPricing(pricing))).toEqual(pricing);
  });
});
