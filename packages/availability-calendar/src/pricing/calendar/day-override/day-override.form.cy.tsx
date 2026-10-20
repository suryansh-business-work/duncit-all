import { describe, expect, it } from 'vitest';
import { buildDayOverrideSchema } from './day-override.form';
import { dayOverrideValues } from './day-override.types';
import { holidaysWith, overrideOn, pricingWithBlocked, pricingWithOverride } from '../day-edits';
import { toFormValues } from '../../form/venue-pricing.types';
import type { VenuePricingData } from '../../types';

const schema = buildDayOverrideSchema((key) => key);
const messages = (values: Parameters<typeof schema.safeParse>[0]) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

const pricing: VenuePricingData = {
  ...toFormValues(null),
  configured: true,
  base_rate: 300,
  operating_hours: [],
  price_rules: [
    { type: 'DATE_OVERRIDE', label: 'Festive', dates: ['2026-12-24', '2026-12-25'], days: [], from: null, to: null, mode: 'PERCENT', value: 50 },
    { type: 'WEEKDAY_SURCHARGE', label: 'Weekend', days: [0, 6], dates: [], from: null, to: null, mode: 'PERCENT', value: 20 },
  ],
  blocked_dates: ['2026-11-02'],
};

describe('buildDayOverrideSchema', () => {
  it('accepts a discount or a surcharge', () => {
    expect(messages({ mode: 'FLAT', value: -500, label: '' })).toEqual([]);
    expect(messages({ mode: 'PERCENT', value: 25, label: 'Diwali' })).toEqual([]);
  });

  it('rejects a zero change and a percent outside -100…1000', () => {
    expect(messages({ mode: 'FLAT', value: 0, label: '' })).toContain('venuePricing.validation.nonZero');
    expect(messages({ mode: 'PERCENT', value: -101, label: '' })).toContain('venuePricing.validation.percentRange');
    expect(messages({ mode: 'FLAT', value: -101, label: '' })).toEqual([]);
  });

  it('starts from the date’s own override, else +10%', () => {
    expect(dayOverrideValues(overrideOn(pricing, '2026-12-25'))).toEqual({ mode: 'PERCENT', value: 50, label: 'Festive' });
    expect(dayOverrideValues(overrideOn(pricing, '2026-12-26'))).toEqual({ mode: 'PERCENT', value: 10, label: '' });
  });
});

describe('one-date edits', () => {
  it('moves only the edited date to its own override and keeps the others', () => {
    const rules = pricingWithOverride(pricing, '2026-12-25', { mode: 'FLAT', value: 1000, label: '' }).price_rules ?? [];
    expect(rules.find((r) => r.label === 'Festive')?.dates).toEqual(['2026-12-24']);
    expect(rules.filter((r) => r.dates?.includes('2026-12-25'))).toEqual([
      expect.objectContaining({ type: 'DATE_OVERRIDE', mode: 'FLAT', value: 1000, dates: ['2026-12-25'] }),
    ]);
    expect(rules.some((r) => r.type === 'WEEKDAY_SURCHARGE')).toBe(true);
  });

  it('drops an override once its last date is cleared', () => {
    const single = { ...pricing, price_rules: pricing.price_rules.map((r) => ({ ...r, dates: (r.dates ?? []).slice(1) })) };
    const cleared = pricingWithOverride(single, '2026-12-25', null);
    expect(cleared.price_rules?.some((r) => r.type === 'DATE_OVERRIDE')).toBe(false);
    expect(cleared.price_rules).toHaveLength(1);
  });

  it('blocks and unblocks a date without duplicates, keeping the rest', () => {
    expect(pricingWithBlocked(pricing, '2026-11-01', true).blocked_dates).toEqual(['2026-11-01', '2026-11-02']);
    expect(pricingWithBlocked(pricing, '2026-11-02', true).blocked_dates).toEqual(['2026-11-02']);
    expect(pricingWithBlocked(pricing, '2026-11-02', false).blocked_dates).toEqual([]);
  });

  it('adds and removes a holiday', () => {
    expect(holidaysWith(['2026-10-31'], '2026-10-24', true)).toEqual(['2026-10-24', '2026-10-31']);
    expect(holidaysWith(['2026-10-31'], '2026-10-31', false)).toEqual([]);
  });
});
