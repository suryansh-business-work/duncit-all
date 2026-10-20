/**
 * The one venue price calculation: every model, rule stacking, limits,
 * fees, GST, the commission on top, rounding, and the Asia/Kolkata day.
 */
import { applicableRules, isPricingConfigured, quoteVenuePrice } from '../../venuePricing.calc';
import type { QuoteRequest, VenuePricing } from '../../venuePricing.types';

const TZ = 'Asia/Kolkata';
// 2027-01-02 is a Saturday, 2027-01-04 a Monday (IST is UTC+05:30).
const ist = (ymd: string, hhmm: string) => new Date(`${ymd}T${hhmm}:00+05:30`);

const base: VenuePricing = {
  model: null,
  base_rate: 0,
  min_pax: 0,
  max_pax: 0,
  min_hours: 0,
  max_hours: 0,
  booking_increment_minutes: 60,
  min_spend: 0,
  slots: [],
  operating_hours: [],
  price_rules: [],
  deposit: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  gst_enabled: false,
  blocked_dates: [],
};

const req = (overrides: Partial<QuoteRequest> = {}): QuoteRequest => ({
  start: ist('2027-01-02', '18:00'),
  end: ist('2027-01-02', '20:00'),
  pax: 0,
  commissionPct: 10,
  gstPct: 18,
  timeZone: TZ,
  ...overrides,
});

const ok = (pricing: VenuePricing, r: QuoteRequest) => {
  const result = quoteVenuePrice(pricing, r);
  if (!result.ok) throw new Error(`expected a quote, got ${result.code}: ${result.message}`);
  return result.breakdown;
};

const saturdayPlus20 = { type: 'WEEKDAY_SURCHARGE' as const, days: [6], mode: 'PERCENT' as const, value: 20 };

describe('quoteVenuePrice — models', () => {
  it('PER_PAX: 20 guests x Rs300 on a Saturday +20% = Rs7,200, commission on top', () => {
    const b = ok({ ...base, model: 'PER_PAX', base_rate: 300, min_pax: 1, price_rules: [saturdayPlus20] }, req({ pax: 20 }));
    expect(b.base).toBe(6000);
    expect(b.rules_total).toBe(1200);
    expect(b.venue_price).toBe(7200);
    expect(b.venue_payout).toBe(7200);
    expect(b.platform_fee).toBe(720);
    expect(b.total).toBe(7920);
    expect(b.pax).toBe(20);
  });

  it('PER_PAX: guests must sit inside min and max, both ends inclusive', () => {
    const p: VenuePricing = { ...base, model: 'PER_PAX', base_rate: 100, min_pax: 10, max_pax: 50 };
    expect(quoteVenuePrice(p, req({ pax: 9 }))).toMatchObject({ ok: false, code: 'PAX_OUT_OF_RANGE' });
    expect(ok(p, req({ pax: 10 })).base).toBe(1000);
    expect(ok(p, req({ pax: 50 })).base).toBe(5000);
    expect(quoteVenuePrice(p, req({ pax: 51 }))).toMatchObject({ ok: false, code: 'PAX_OUT_OF_RANGE' });
  });

  it('PER_PAX: zero guests is refused even with no minimum set', () => {
    const p: VenuePricing = { ...base, model: 'PER_PAX', base_rate: 100 };
    expect(quoteVenuePrice(p, req({ pax: 0 }))).toMatchObject({ ok: false, code: 'PAX_OUT_OF_RANGE' });
  });

  it('PER_HOUR: prices the hours, and holds min/max hours and the booking step', () => {
    const p: VenuePricing = { ...base, model: 'PER_HOUR', base_rate: 500, min_hours: 2, max_hours: 6, booking_increment_minutes: 30 };
    const b = ok(p, req({ end: ist('2027-01-02', '20:30') }));
    expect(b.hours).toBe(2.5);
    expect(b.base).toBe(1250);
    expect(ok(p, req()).base).toBe(1000);
    expect(quoteVenuePrice(p, req({ end: ist('2027-01-02', '19:30') }))).toMatchObject({ ok: false, code: 'HOURS_OUT_OF_RANGE' });
    expect(quoteVenuePrice(p, req({ end: ist('2027-01-03', '00:30') }))).toMatchObject({ ok: false, code: 'HOURS_OUT_OF_RANGE' });
    expect(quoteVenuePrice(p, req({ start: ist('2027-01-02', '18:15') }))).toMatchObject({ ok: false, code: 'INCREMENT_MISMATCH' });
  });

  it('PER_SLOT: books only a published window on its weekday, at that slot price', () => {
    const p: VenuePricing = {
      ...base,
      model: 'PER_SLOT',
      slots: [{ start_time: '18:00', end_time: '21:00', price: 2000, days_of_week: [6] }],
    };
    expect(ok(p, req({ end: ist('2027-01-02', '21:00') })).base).toBe(2000);
    expect(quoteVenuePrice(p, req({ start: ist('2027-01-04', '18:00'), end: ist('2027-01-04', '21:00') }))).toMatchObject({
      ok: false,
      code: 'NO_SUCH_SLOT',
    });
    expect(quoteVenuePrice(p, req())).toMatchObject({ ok: false, code: 'NO_SUCH_SLOT' });
  });

  it('FLAT: the rate whatever the window', () => {
    const p: VenuePricing = { ...base, model: 'FLAT', base_rate: 5000 };
    expect(ok(p, req()).base).toBe(5000);
    expect(ok(p, req({ end: ist('2027-01-02', '23:00') })).base).toBe(5000);
  });

  it('refuses an unset venue and an empty or reversed window', () => {
    expect(quoteVenuePrice(base, req())).toMatchObject({ ok: false, code: 'NOT_CONFIGURED' });
    expect(quoteVenuePrice(null, req())).toMatchObject({ ok: false, code: 'NOT_CONFIGURED' });
    const p: VenuePricing = { ...base, model: 'FLAT', base_rate: 100 };
    expect(quoteVenuePrice(p, req({ end: ist('2027-01-02', '18:00') }))).toMatchObject({ ok: false, code: 'INVALID_WINDOW' });
  });
});

describe('quoteVenuePrice — rules, fees and money', () => {
  const flat1000: VenuePricing = { ...base, model: 'FLAT', base_rate: 1000 };

  it('stacks weekday and date-range rules on the base, never compounded', () => {
    const p = {
      ...flat1000,
      price_rules: [saturdayPlus20, { type: 'DATE_RANGE' as const, from: '2027-01-01', to: '2027-01-05', mode: 'FLAT' as const, value: 500 }],
    };
    const b = ok(p, req());
    expect(b.rules.map((r) => r.amount)).toEqual([200, 500]);
    expect(b.venue_price).toBe(1700);
  });

  it('a matching date override replaces every other rule that day', () => {
    const p = {
      ...flat1000,
      price_rules: [saturdayPlus20, { type: 'DATE_OVERRIDE' as const, dates: ['2027-01-02'], mode: 'PERCENT' as const, value: -10, label: 'New year' }],
    };
    const b = ok(p, req());
    expect(b.rules).toEqual([{ type: 'DATE_OVERRIDE', label: 'New year', mode: 'PERCENT', value: -10, amount: -100 }]);
    expect(b.venue_price).toBe(900);
  });

  it('a discount never takes the price below zero', () => {
    const p = { ...flat1000, price_rules: [{ type: 'WEEKDAY_SURCHARGE' as const, days: [6], mode: 'FLAT' as const, value: -2000 }] };
    expect(ok(p, req()).venue_price).toBe(0);
  });

  it('tops up to the minimum spend, and not past it', () => {
    expect(ok({ ...flat1000, min_spend: 1500 }, req()).min_spend_top_up).toBe(500);
    expect(ok({ ...flat1000, min_spend: 1500 }, req()).venue_price).toBe(1500);
    expect(ok({ ...flat1000, min_spend: 800 }, req()).min_spend_top_up).toBe(0);
  });

  it('adds fees and GST to the venue payout; commission on the price; deposit outside the total', () => {
    const p = { ...flat1000, cleaning_fee: 200, pet_fee: 100, gst_enabled: true, deposit: 2000 };
    const b = ok(p, req({ pets: true }));
    expect(b.venue_price).toBe(1300);
    expect(b.taxes).toBe(234);
    expect(b.venue_payout).toBe(1534);
    expect(b.platform_fee).toBe(130);
    expect(b.total).toBe(1664);
    expect(b.deposit).toBe(2000);
    expect(ok(p, req({ pets: false })).pet_fee).toBe(0);
    expect(ok({ ...p, gst_enabled: false }, req()).taxes).toBe(0);
  });

  it('rounds each line half-up to the paisa so the lines add up', () => {
    const p: VenuePricing = { ...base, model: 'PER_PAX', base_rate: 333.33, min_pax: 1, gst_enabled: true };
    const b = ok(p, req({ pax: 3, commissionPct: 7.5 }));
    expect(b.venue_price).toBe(999.99);
    expect(b.taxes).toBe(180);
    expect(b.platform_fee).toBe(75);
    expect(b.total).toBe(Math.round((b.venue_payout + b.platform_fee) * 100) / 100);
  });

  it('judges the day on the Asia/Kolkata clock, not UTC', () => {
    // 20:00 UTC on Saturday is 01:30 IST on Sunday: the Saturday surcharge must not apply.
    const p = { ...flat1000, price_rules: [saturdayPlus20] };
    const b = ok(p, req({ start: new Date('2027-01-02T20:00:00Z'), end: new Date('2027-01-02T22:00:00Z') }));
    expect(b.date).toBe('2027-01-03');
    expect(b.rules).toHaveLength(0);
  });
});

describe('helpers', () => {
  it('isPricingConfigured needs a model and a rate, or a slot for PER_SLOT', () => {
    expect(isPricingConfigured(null)).toBe(false);
    expect(isPricingConfigured({ ...base, model: 'FLAT', base_rate: 0 })).toBe(false);
    expect(isPricingConfigured({ ...base, model: 'FLAT', base_rate: 1 })).toBe(true);
    expect(isPricingConfigured({ ...base, model: 'PER_SLOT' })).toBe(false);
    expect(isPricingConfigured({ ...base, model: 'PER_SLOT', slots: [{ start_time: '10:00', end_time: '11:00', price: 0, days_of_week: [1] }] })).toBe(true);
  });

  it('applicableRules labels a rule by its type when it has no label', () => {
    const { applied } = applicableRules([{ ...saturdayPlus20 }], '2027-01-02', 6, 10000);
    expect(applied[0]).toMatchObject({ label: 'Weekday surcharge', amount: 20 });
  });
});
