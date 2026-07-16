import { describe, expect, it } from 'vitest';
import { adsPricingSchema, fromAdPricing, toUpdateAdPricingInput } from './ads-pricing.form';
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
};

const valid = fromAdPricing(pricing);

const messages = (result: ReturnType<typeof adsPricingSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('fromAdPricing', () => {
  it('stringifies prices for the text fields', () => {
    expect(valid.auto_per_day).toBe('500');
    expect(valid.currency_symbol).toBe('₹');
  });
});

describe('adsPricingSchema', () => {
  it('accepts a valid pricing sheet', () => {
    const parsed = adsPricingSchema.parse(valid);
    expect(parsed.home_bottom_per_day).toBe('750');
  });

  it('requires every per-day price', () => {
    const result = adsPricingSchema.safeParse({ ...valid, pod_list_per_day: '' });
    expect(messages(result)).toMatch(/pod list price is required/i);
  });

  it('rejects a non-numeric price', () => {
    const result = adsPricingSchema.safeParse({ ...valid, home_bottom_per_day: 'abc' });
    expect(messages(result)).toMatch(/must be a number/i);
  });

  it('rejects a negative price', () => {
    const result = adsPricingSchema.safeParse({ ...valid, sidebar_per_day: '-5' });
    expect(messages(result)).toMatch(/cannot be negative/i);
  });

  it('accepts a zero price (free placement)', () => {
    const result = adsPricingSchema.safeParse({ ...valid, status_per_day: '0' });
    expect(result.success).toBe(true);
  });

  it('requires the currency symbol', () => {
    const result = adsPricingSchema.safeParse({ ...valid, currency_symbol: '  ' });
    expect(messages(result)).toMatch(/currency symbol is required/i);
  });

  it('rejects an over-long currency symbol', () => {
    const result = adsPricingSchema.safeParse({ ...valid, currency_symbol: 'RUPEES' });
    expect(messages(result)).toMatch(/at most 4/i);
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

  it('round-trips a pricing sheet unchanged', () => {
    expect(toUpdateAdPricingInput(fromAdPricing(pricing))).toEqual(pricing);
  });
});
