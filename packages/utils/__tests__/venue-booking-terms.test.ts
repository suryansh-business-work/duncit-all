/**
 * The venue's pricing terms Create Pod shows a host before a time is picked —
 * one builder for mWeb's MUI card and the native Tamagui card.
 */
import { describe, expect, it } from 'vitest';

import { TERMS_DATES_SHOWN, venuePricingTerms, type VenueTermsFormat, type VenueTermsSource } from '../src/venue-booking-terms';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Echoes the key and its vars, so each assertion reads what was asked for. */
const format: VenueTermsFormat = {
  t: (key, opts) => (opts?.vars ? `${key} ${JSON.stringify(opts.vars)}` : key),
  money: (value) => `₹${value}`,
  clock: (hhmm) => `[${hhmm}]`,
  date: (ymd) => `<${ymd}>`,
  weekday: (day) => WEEKDAYS[day],
  today: '2026-10-21',
};

const source = (over: Partial<VenueTermsSource> = {}): VenueTermsSource => ({
  model: 'PER_PAX',
  base_rate: 300,
  min_pax: 0,
  max_pax: 0,
  min_hours: 0,
  max_hours: 0,
  booking_increment_minutes: 0,
  min_spend: 0,
  slots: [],
  operating_hours: [],
  price_rules: [],
  deposit: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  gst_enabled: false,
  ...over,
});

const section = (src: VenueTermsSource, id: string) => venuePricingTerms(src, format).find((s) => s.id === id);
const rows = (src: VenueTermsSource, id: string) => section(src, id)?.rows ?? [];
const valueOf = (src: VenueTermsSource, sectionId: string, rowId: string) =>
  rows(src, sectionId).find((row) => row.id === rowId)?.value;

describe('venuePricingTerms — booking', () => {
  it('names the model and the rate per guest, with the guest range', () => {
    const src = source({ min_pax: 10, max_pax: 40 });
    expect(rows(src, 'booking')).toEqual([
      { id: 'model', label: 'mweb.createPod.venueTerms.model', value: 'mweb.createPod.bookingModel.perPax' },
      { id: 'rate', label: 'mweb.createPod.venueTerms.rate', value: 'mweb.createPod.venueTerms.ratePerGuest {"price":"₹300"}' },
      { id: 'guests', label: 'mweb.createPod.venueTerms.guests', value: 'mweb.createPod.bookingGuestsRange {"min":10,"max":40}' },
    ]);
    expect(section(src, 'booking')?.title).toBe('mweb.createPod.venueTerms.sectionBooking');
  });

  it('reads an uncapped guest count from at least one guest', () => {
    expect(valueOf(source(), 'booking', 'guests')).toBe('mweb.createPod.bookingGuestsMin {"min":1}');
  });

  it('shows a per-hour venue’s length limits and booking step', () => {
    const hourly = (over: Partial<VenueTermsSource>) => source({ model: 'PER_HOUR', booking_increment_minutes: 30, ...over });
    expect(valueOf(hourly({ min_hours: 2, max_hours: 6 }), 'booking', 'hours')).toBe(
      'mweb.createPod.venueTerms.hoursRange {"min":2,"max":6}'
    );
    expect(valueOf(hourly({ min_hours: 2 }), 'booking', 'hours')).toBe('mweb.createPod.venueTerms.hoursMin {"min":2}');
    expect(valueOf(hourly({ max_hours: 6 }), 'booking', 'hours')).toBe('mweb.createPod.venueTerms.hoursMax {"max":6}');
    expect(valueOf(hourly({}), 'booking', 'hours')).toBeUndefined();
    expect(valueOf(hourly({}), 'booking', 'rate')).toBe('mweb.createPod.venueTerms.ratePerHour {"price":"₹300"}');
    expect(valueOf(hourly({}), 'booking', 'step')).toBe('mweb.createPod.venueTerms.stepMinutes {"minutes":30}');
    expect(valueOf(hourly({}), 'booking', 'guests')).toBeUndefined();
  });

  it('gives a flat venue one price and no step when it sets none', () => {
    const src = source({ model: 'FLAT', base_rate: 5000, booking_increment_minutes: Number.NaN });
    expect(rows(src, 'booking').map((row) => row.id)).toEqual(['model', 'rate']);
    expect(valueOf(src, 'booking', 'rate')).toBe('₹5000');
  });

  it('prices a slot venue from its cheapest running slot, with no step', () => {
    const slots = [
      { price: 1500, days_of_week: [1, 2] },
      { price: 800, days_of_week: [6] },
      { price: 100, days_of_week: [] },
    ];
    const src = source({ model: 'PER_SLOT', slots, booking_increment_minutes: 60 });
    expect(rows(src, 'booking').find((row) => row.id === 'rate')).toEqual({
      id: 'rate',
      label: 'mweb.createPod.venueTerms.slotPrice',
      value: 'mweb.createPod.venueTerms.slotsFrom {"price":"₹800"}',
    });
    expect(valueOf(src, 'booking', 'step')).toBeUndefined();
    expect(valueOf(source({ model: 'PER_SLOT', slots: [slots[0], { price: 1500, days_of_week: [3] }] }), 'booking', 'rate')).toBe('₹1500');
    expect(valueOf(source({ model: 'PER_SLOT', slots: [slots[2]] }), 'booking', 'rate')).toBeUndefined();
  });

  it('leaves out a model this client does not know', () => {
    expect(rows(source({ model: 'HOURLY' }), 'booking').map((row) => row.id)).toEqual(['rate']);
    expect(rows(source({ model: null }), 'booking').map((row) => row.id)).toEqual(['rate']);
  });
});

describe('venuePricingTerms — price changes', () => {
  it('lists weekday changes Monday first, under the owner’s own label when there is one', () => {
    const src = source({
      price_rules: [
        { type: 'WEEKDAY_SURCHARGE', label: 'Weekend', days: [0, 6], mode: 'PERCENT', value: 20 },
        { type: 'WEEKDAY_SURCHARGE', days: [1], mode: 'FLAT', value: -100 },
        { type: 'WEEKDAY_SURCHARGE', days: [], mode: 'FLAT', value: 50 },
      ],
    });
    expect(rows(src, 'rules')).toEqual([
      { id: 'rule-0', label: 'Weekend', value: 'mweb.createPod.venueTerms.ruleOn {"change":"+20%","when":"Sat, Sun"}' },
      { id: 'rule-1', label: 'mweb.createPod.quote.ruleWeekday', value: 'mweb.createPod.venueTerms.ruleOn {"change":"-₹100","when":"Mon"}' },
    ]);
    expect(section(src, 'rules')?.title).toBe('mweb.createPod.venueTerms.sectionRules');
  });

  it('lists only the override dates still to come, sorted, then how many more', () => {
    const dates = ['2026-12-31', '2026-10-01', '2026-10-21', '2026-11-05', '2026-12-25', '2027-01-01'];
    const src = source({ price_rules: [{ type: 'DATE_OVERRIDE', dates, mode: 'FLAT', value: 1000 }] });
    expect(rows(src, 'rules')).toEqual([
      {
        id: 'rule-0',
        label: 'mweb.createPod.quote.ruleDate',
        value: `mweb.createPod.venueTerms.ruleOnMore {"change":"+₹1000","when":"<2026-10-21>, <2026-11-05>, <2026-12-25>","count":${
          5 - TERMS_DATES_SHOWN
        }}`,
      },
    ]);
    const few = source({ price_rules: [{ type: 'DATE_OVERRIDE', dates: ['2026-11-05'], mode: 'PERCENT', value: 50 }] });
    expect(valueOf(few, 'rules', 'rule-0')).toBe('mweb.createPod.venueTerms.ruleOn {"change":"+50%","when":"<2026-11-05>"}');
  });

  it('shows a date range until it ends, and drops past or unreadable rules', () => {
    const src = source({
      price_rules: [
        { type: 'DATE_RANGE', label: 'Diwali', from: '2026-10-20', to: '2026-10-25', mode: 'PERCENT', value: 10 },
        { type: 'DATE_RANGE', from: '2026-09-01', to: '2026-09-30', mode: 'PERCENT', value: 10 },
        { type: 'DATE_RANGE', from: null, to: '2026-12-01', mode: 'PERCENT', value: 10 },
        { type: 'DATE_OVERRIDE', dates: ['2026-10-20'], mode: 'FLAT', value: 10 },
        { type: 'DATE_OVERRIDE', dates: null, mode: 'FLAT', value: 10 },
        { type: 'WEEKDAY_SURCHARGE', days: null, mode: 'FLAT', value: 10 },
      ],
    });
    expect(rows(src, 'rules')).toEqual([
      {
        id: 'rule-0',
        label: 'Diwali',
        value: 'mweb.createPod.venueTerms.ruleBetween {"change":"+10%","from":"<2026-10-20>","to":"<2026-10-25>"}',
      },
    ]);
  });

  it('names a rule of an unknown type as a date change', () => {
    const src = source({ price_rules: [{ type: 'SOMETHING_NEW', from: '2026-11-01', to: '2026-11-02', mode: 'PERCENT', value: 5 }] });
    expect(rows(src, 'rules')[0]?.label).toBe('mweb.createPod.quote.ruleDate');
  });

  it('has no price changes section without live rules', () => {
    expect(section(source(), 'rules')).toBeUndefined();
  });
});

describe('venuePricingTerms — fees', () => {
  it('lists every fee the venue charges, GST, and the deposit settled at the venue', () => {
    const src = source({ min_spend: 2000, cleaning_fee: 300, pet_fee: 200, gst_enabled: true, deposit: 1000 });
    expect(rows(src, 'fees')).toEqual([
      { id: 'min-spend', label: 'mweb.createPod.venueTerms.minSpend', value: '₹2000' },
      { id: 'cleaning', label: 'mweb.createPod.quote.cleaning', value: '₹300' },
      { id: 'pets', label: 'mweb.createPod.quote.pets', value: 'mweb.createPod.venueTerms.petFeeValue {"amount":"₹200"}' },
      { id: 'gst', label: 'mweb.createPod.venueTerms.gst', value: 'mweb.createPod.venueTerms.gstValue' },
      { id: 'deposit', label: 'mweb.createPod.venueTerms.deposit', value: 'mweb.createPod.venueTerms.depositValue {"amount":"₹1000"}' },
    ]);
    expect(section(src, 'fees')?.title).toBe('mweb.createPod.venueTerms.sectionFees');
  });

  it('has no fees section when the venue charges none', () => {
    expect(section(source(), 'fees')).toBeUndefined();
  });
});

describe('venuePricingTerms — open hours', () => {
  const hours = [
    { day: 0, open: '10:00', close: '18:00' },
    { day: 6, open: '10:00', close: '23:00' },
    { day: 1, open: '09:00', close: '22:00' },
    { day: 2, open: '09:00', close: '22:00' },
    { day: 5, open: '10:00', close: '23:00' },
  ];

  it('groups weekdays sharing a window, Monday first, then the days it stays shut', () => {
    expect(rows(source({ operating_hours: hours }), 'hours')).toEqual([
      { id: 'hours-12', label: 'Mon, Tue', value: 'mweb.createPod.venueTerms.hoursWindow {"open":"[09:00]","close":"[22:00]"}' },
      { id: 'hours-56', label: 'Fri, Sat', value: 'mweb.createPod.venueTerms.hoursWindow {"open":"[10:00]","close":"[23:00]"}' },
      { id: 'hours-0', label: 'Sun', value: 'mweb.createPod.venueTerms.hoursWindow {"open":"[10:00]","close":"[18:00]"}' },
      { id: 'hours-closed', label: 'Wed, Thu', value: 'mweb.createPod.venueTerms.closed' },
    ]);
  });

  it('has no closed row when the venue opens every day', () => {
    const everyDay = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '09:00', close: '21:00' }));
    expect(rows(source({ operating_hours: everyDay }), 'hours').map((row) => row.id)).toEqual(['hours-1234560']);
  });

  it('leaves hours out for a slot venue, or a venue that set none', () => {
    expect(section(source({ model: 'PER_SLOT', operating_hours: hours }), 'hours')).toBeUndefined();
    expect(section(source(), 'hours')).toBeUndefined();
    expect(section(source({ operating_hours: hours }), 'hours')?.title).toBe('mweb.createPod.venueTerms.sectionHours');
  });
});

describe('venuePricingTerms — sections', () => {
  it('keeps the reading order and drops empty sections', () => {
    const src = source({
      price_rules: [{ type: 'WEEKDAY_SURCHARGE', days: [6], mode: 'PERCENT', value: 20 }],
      cleaning_fee: 100,
      operating_hours: [{ day: 1, open: '09:00', close: '17:00' }],
    });
    expect(venuePricingTerms(src, format).map((s) => s.id)).toEqual(['booking', 'rules', 'fees', 'hours']);
    expect(venuePricingTerms(source({ model: null, base_rate: 0 }), format).map((s) => s.id)).toEqual(['booking']);
  });
});
