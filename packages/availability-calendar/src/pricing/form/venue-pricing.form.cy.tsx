import { describe, expect, it } from 'vitest';
import { buildVenuePricingSchema } from './venue-pricing.schema';
import { blankRule, blankSlot, toFormValues, toPricingInput, type VenuePricingFormValues } from './venue-pricing.types';

// Outside React the key itself stands in for a translator, so a message is its key.
const schema = buildVenuePricingSchema((key) => key);

const issues = (values: VenuePricingFormValues) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

const perPax = (patch: Partial<VenuePricingFormValues> = {}): VenuePricingFormValues => ({
  ...toFormValues(null),
  base_rate: 300,
  ...patch,
});

describe('buildVenuePricingSchema', () => {
  it('accepts a per-guest venue with a rate', () => {
    expect(issues(perPax())).toEqual([]);
  });

  it('requires a rate for every model but per-slot', () => {
    expect(issues(perPax({ base_rate: 0 }))).toContain('base_rate:venuePricing.validation.rateRequired');
    expect(issues(perPax({ model: 'PER_SLOT', base_rate: 0, slots: [{ ...blankSlot(), price: 500 }] }))).toEqual([]);
  });

  it('rejects an emptied number field instead of saving zero', () => {
    expect(issues(perPax({ cleaning_fee: Number.NaN }))).toContain('cleaning_fee:venuePricing.validation.number');
  });

  it('needs at least one slot, with its end after its start, on a per-slot venue', () => {
    expect(issues(perPax({ model: 'PER_SLOT', slots: [] }))).toContain('slots:venuePricing.validation.slotRequired');
    const backwards = { ...blankSlot(), start_time: '14:00', end_time: '12:00' };
    expect(issues(perPax({ model: 'PER_SLOT', slots: [backwards] }))).toContain(
      'slots.0.end_time:venuePricing.validation.endAfterStart',
    );
  });

  it('keeps the maximum guests and hours at or above the minimum (0 = no limit)', () => {
    expect(issues(perPax({ min_pax: 10, max_pax: 5 }))).toContain('max_pax:venuePricing.validation.maxPax');
    expect(issues(perPax({ min_pax: 10, max_pax: 0 }))).toEqual([]);
    expect(issues(perPax({ model: 'PER_HOUR', min_hours: 3, max_hours: 2 }))).toContain(
      'max_hours:venuePricing.validation.maxHours',
    );
  });

  it('sells per-hour bookings only in 15-minute steps', () => {
    expect(issues(perPax({ model: 'PER_HOUR', booking_increment_minutes: 20 }))).toContain(
      'booking_increment_minutes:venuePricing.validation.step',
    );
    expect(issues(perPax({ model: 'PER_HOUR', booking_increment_minutes: 30 }))).toEqual([]);
  });

  it('checks each rule against its own type', () => {
    const weekday = { ...blankRule('WEEKDAY_SURCHARGE'), days: [] };
    const range = { ...blankRule('DATE_RANGE'), from: '2026-12-31', to: '2026-12-01' };
    const percent = { ...blankRule('DATE_OVERRIDE'), dates: ['2026-12-25'], value: -150 };
    const found = issues(perPax({ price_rules: [weekday, range, percent] }));
    expect(found).toContain('price_rules.0.days:venuePricing.validation.pickDay');
    expect(found).toContain('price_rules.1.to:venuePricing.validation.range');
    expect(found).toContain('price_rules.2.value:venuePricing.validation.percentRange');
  });

  it('needs one open day when the owner sets their own hours', () => {
    const closed = toFormValues(null).operating_hours.map((h) => ({ ...h, enabled: false }));
    expect(issues(perPax({ custom_hours: true, operating_hours: closed }))).toContain(
      'operating_hours:venuePricing.validation.openOneDay',
    );
  });
});

describe('toPricingInput', () => {
  it('sends only the fields a rule type reads', () => {
    const rule = { ...blankRule('DATE_OVERRIDE'), dates: ['2026-12-25'], days: [6], from: '2026-01-01', label: '  ' };
    const input = toPricingInput(perPax({ price_rules: [rule] }));
    expect(input.price_rules?.[0]).toEqual({
      type: 'DATE_OVERRIDE',
      label: null,
      mode: 'PERCENT',
      value: 10,
      days: [],
      dates: ['2026-12-25'],
      from: null,
      to: null,
    });
  });

  it('falls back to the venue hours unless the owner set their own, and sends only open days', () => {
    expect(toPricingInput(perPax()).operating_hours).toEqual([]);
    const hours = toFormValues(null).operating_hours.map((h) => ({ ...h, enabled: h.day === 6 }));
    expect(toPricingInput(perPax({ custom_hours: true, operating_hours: hours })).operating_hours).toEqual([
      { day: 6, open: '09:00', close: '21:00' },
    ]);
  });

  it('drops the slots of a non-slot venue and the rate of a slot venue', () => {
    const slots = [{ ...blankSlot(), price: 500 }];
    expect(toPricingInput(perPax({ slots })).slots).toEqual([]);
    expect(toPricingInput(perPax({ model: 'PER_SLOT', slots })).base_rate).toBe(0);
  });

  it('round-trips saved pricing through the form unchanged', () => {
    const saved = {
      model: 'PER_HOUR' as const,
      configured: true,
      base_rate: 1200,
      min_pax: 2,
      max_pax: 40,
      min_hours: 2,
      max_hours: 6,
      booking_increment_minutes: 30,
      min_spend: 5000,
      slots: [],
      operating_hours: [{ day: 5, open: '10:00', close: '23:00' }],
      price_rules: [{ type: 'WEEKDAY_SURCHARGE' as const, label: 'Weekend', days: [0, 6], dates: [], from: null, to: null, mode: 'PERCENT' as const, value: 20 }],
      deposit: 2000,
      cleaning_fee: 500,
      pet_fee: 300,
      gst_enabled: true,
      blocked_dates: ['2026-11-01'],
    };
    const { configured: _configured, ...expected } = saved;
    expect(toPricingInput(toFormValues(saved))).toEqual(expected);
  });
});
