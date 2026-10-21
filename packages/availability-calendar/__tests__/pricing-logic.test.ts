import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranslation } from '@duncit/app-settings';
import {
  closedReasonLabel,
  errorText,
  modelHint,
  modelLabel,
  rateLabel,
  ruleModeLabel,
  ruleTypeLabel,
  ruleValueLabel,
  rupees,
} from '../src/pricing/format';
import { dayPrice, rulesOn } from '../src/pricing/calendar/day-price';
import { bookingOf, defaultSample, wallInstant } from '../src/pricing/preview/usePriceQuote';
import { savedPricingInput, toFormValues, toPricingInput, toRuleInput } from '../src/pricing/form';
import { EVENT_REQUEST_STATUS_COLOR, eventRequestStatusLabel, isAnswerable } from '../src/event-requests/status';
import { buildRespondSchema, offerInput, respondDefaults } from '../src/event-requests/respond-form';
import type { PricingRule } from '../src/pricing/types';
import { makePricing } from './pricing-fixtures';

// The shipped English copy — the floor a component without a LocaleProvider reads.
const { t } = renderHook(() => useTranslation()).result.current;

const weekend: PricingRule = { type: 'WEEKDAY_SURCHARGE', label: 'Weekend', days: [0, 6], dates: [], from: null, to: null, mode: 'PERCENT', value: 20 };
const december: PricingRule = { type: 'DATE_RANGE', label: 'December', days: [], dates: [], from: '2026-12-01', to: '2026-12-31', mode: 'FLAT', value: 50 };
const boxingDay: PricingRule = { type: 'DATE_OVERRIDE', label: 'Boxing day', days: [], dates: ['2026-12-26'], from: null, to: null, mode: 'FLAT', value: -100 };

describe('pricing copy', () => {
  it('shows rupees whole when they are whole and to the paisa when not', () => {
    expect(rupees(6000)).toBe('₹6,000');
    expect(rupees(12.5)).toBe('₹12.50');
  });

  it('signs a rule as the owner set it, percent or rupees', () => {
    expect(ruleValueLabel('PERCENT', 20)).toBe('+20%');
    expect(ruleValueLabel('PERCENT', -15)).toBe('-15%');
    expect(ruleValueLabel('FLAT', 500)).toBe('+₹500');
    expect(ruleValueLabel('FLAT', -500)).toBe('-₹500');
  });

  it('names every model, rule type, mode and closed reason', () => {
    expect(['PER_PAX', 'PER_HOUR', 'PER_SLOT', 'FLAT'].map((m) => modelLabel(t, m as never))).toEqual([
      'Per guest',
      'Per hour',
      'Per slot',
      'Flat price',
    ]);
    expect(modelHint(t, 'PER_SLOT')).toBe('Fixed time slots, each with its own price.');
    expect(modelHint(t, 'FLAT')).toBe('One price for the booking, whatever its length or size.');
    expect(ruleTypeLabel(t, 'WEEKDAY_SURCHARGE')).toBe('Weekday surcharge');
    expect(ruleTypeLabel(t, 'DATE_OVERRIDE')).toBe('Date override');
    expect(ruleTypeLabel(t, 'DATE_RANGE')).toBe('Date range');
    expect(ruleModeLabel(t, 'PERCENT')).toBe('Percent');
    expect(ruleModeLabel(t, 'FLAT')).toBe('Amount (₹)');
    expect(['PAST', 'TOO_FAR', 'HOLIDAY', 'BLOCKED', 'WEEKLY_OFF', 'CLOSED'].map((r) => closedReasonLabel(t, r as never))).toEqual([
      'Past',
      'Too far ahead',
      'Holiday',
      'Blocked',
      'Weekly off',
      'Closed',
    ]);
  });

  it('gives the rate its unit, except for a slot or flat price', () => {
    expect(rateLabel(t, 'PER_PAX', 300)).toBe('₹300 / guest');
    expect(rateLabel(t, 'PER_HOUR', 1000)).toBe('₹1,000 / hour');
    expect(rateLabel(t, 'FLAT', 5000)).toBe('₹5,000');
  });

  it("shows the server's message, else the fallback", () => {
    expect(errorText(new Error('base_rate must be at most 1000000'), 'Fallback')).toBe('base_rate must be at most 1000000');
    expect(errorText(new Error(''), 'Fallback')).toBe('Fallback');
    expect(errorText('boom', 'Fallback')).toBe('Fallback');
    expect(errorText(undefined, 'Fallback')).toBe('Fallback');
  });
});

describe('dayPrice', () => {
  it('shows nothing until a model is chosen', () => {
    expect(dayPrice(t, makePricing({ model: null }), undefined, '2026-12-02')).toBeNull();
  });

  it('names why a closed day is closed instead of a price', () => {
    const day = { date: '2026-12-25', closed_reason: 'HOLIDAY' as const, open: null, close: null, busy: [], slots: [] };
    expect(dayPrice(t, makePricing(), day, '2026-12-25')).toEqual({ text: 'Holiday', adjustment: null, override: false, closed: true });
  });

  it("shows the plain rate on a day no rule touches, and the day's rate after its one rule", () => {
    const pricing = makePricing({ price_rules: [weekend] });
    expect(dayPrice(t, pricing, undefined, '2026-12-02')).toEqual({ text: '₹300 / guest', adjustment: null, override: false, closed: false });
    // 26 Dec 2026 is a Saturday: +20% on ₹300.
    expect(dayPrice(t, pricing, undefined, '2026-12-26')).toEqual({ text: '₹360 / guest', adjustment: '+20%', override: false, closed: false });
  });

  it('says "Adjusted" when several rules stack, and lets a date override win outright', () => {
    const stacked = makePricing({ model: 'PER_HOUR', base_rate: 1000, price_rules: [weekend, december] });
    expect(dayPrice(t, stacked, undefined, '2026-12-26')?.adjustment).toBe('Adjusted');

    const overridden = makePricing({ price_rules: [weekend, december, boxingDay] });
    expect(rulesOn(overridden.price_rules, '2026-12-26')).toEqual({ rules: [boxingDay], override: true });
    expect(dayPrice(t, overridden, undefined, '2026-12-26')).toEqual({ text: '₹200 / guest', adjustment: '-₹100', override: true, closed: false });
  });

  it("prices a per-slot day from its cheapest slot, and calls a day without slots closed", () => {
    const pricing = makePricing({ model: 'PER_SLOT', base_rate: 0 });
    const slots = [
      { start: '2026-12-02T10:00:00.000Z', end: '2026-12-02T12:00:00.000Z', price: 800, available: true },
      { start: '2026-12-02T14:00:00.000Z', end: '2026-12-02T16:00:00.000Z', price: 500, available: false },
    ];
    const day = { date: '2026-12-02', closed_reason: null, open: null, close: null, busy: [], slots };
    expect(dayPrice(t, pricing, day, '2026-12-02')).toEqual({ text: 'from ₹500', adjustment: null, override: false, closed: false });
    expect(dayPrice(t, pricing, { ...day, slots: [] }, '2026-12-02')).toEqual({ text: 'No slots', adjustment: null, override: false, closed: true });
    expect(dayPrice(t, pricing, undefined, '2026-12-02')?.text).toBe('No slots');
  });
});

describe('sample bookings', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 11, 1, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads a wall-clock day and time on this device, or nothing when either is not one', () => {
    expect(wallInstant('2026-12-02', '18:30')).toBe(new Date(2026, 11, 2, 18, 30).toISOString());
    expect(wallInstant('soon', '18:30')).toBeNull();
    expect(wallInstant('2026-12-02', '')).toBeNull();
  });

  it('only prices a window that ends after it starts, with whole guests', () => {
    const sample = { date: '2026-12-02', start: '18:00', end: '20:00', pax: 12.7, pets: true };
    expect(bookingOf(sample)).toEqual({
      start_at: new Date(2026, 11, 2, 18).toISOString(),
      end_at: new Date(2026, 11, 2, 20).toISOString(),
      pax: 12,
      pets: true,
    });
    expect(bookingOf({ ...sample, pax: Number.NaN })?.pax).toBe(0);
    expect(bookingOf({ ...sample, end: '18:00' })).toBeNull();
    expect(bookingOf({ ...sample, start: '' })).toBeNull();
    expect(bookingOf({ ...sample, end: '' })).toBeNull();
  });

  it('starts the preview on tomorrow evening for 10 guests', () => {
    expect(defaultSample()).toEqual({ date: '2026-12-02', start: '18:00', end: '20:00', pax: 10, pets: false });
  });

  it('starts a counter offer on tomorrow evening when there is no offer yet, and sends emptied guests as 0', () => {
    expect(respondDefaults(null)).toEqual({ note: '', date: '2026-12-02', start: '18:00', end: '20:00', pax: 10 });
    expect(offerInput({ note: '', date: '2026-12-02', start: '18:00', end: '20:00', pax: Number.NaN })?.pax).toBe(0);
  });
});

describe('counter offer schema', () => {
  it('needs a start time as well as an end after it', () => {
    const result = buildRespondSchema(t, 'COUNTER').safeParse({ note: '', date: '2026-12-02', start: '', end: '20:00', pax: 10 });
    expect(result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}:${i.message}`)).toEqual(['start:Pick a time']);
  });
});

describe('pricing form values', () => {
  it('reads a saved rule whose optional fields came back null', () => {
    const bare = { type: 'DATE_RANGE' as const, label: null, days: null, dates: null, from: null, to: null, mode: 'FLAT' as const, value: 50 };
    expect(toFormValues(makePricing({ price_rules: [bare] })).price_rules).toEqual([
      { type: 'DATE_RANGE', label: '', mode: 'FLAT', value: 50, days: [], dates: [], from: '', to: '' },
    ]);
  });

  it('sends a date range with its from and to', () => {
    const rule = { type: 'DATE_RANGE' as const, label: 'Peak', mode: 'PERCENT' as const, value: 15, days: [1], dates: ['2026-12-02'], from: '2026-12-20', to: '2026-12-31' };
    expect(toRuleInput(rule)).toEqual({ type: 'DATE_RANGE', label: 'Peak', mode: 'PERCENT', value: 15, days: [], dates: [], from: '2026-12-20', to: '2026-12-31' });
  });

  it('keeps an unconfigured venue without a model when a calendar edit resends its pricing', () => {
    expect(savedPricingInput(makePricing({ model: null, configured: false })).model).toBeNull();
    expect(savedPricingInput(makePricing({ model: 'FLAT' })).model).toBe('FLAT');
  });

  // A slot read back from the server carries Apollo's __typename, which
  // PricingSlotInput rejects — the save, the preview's draft and a calendar
  // edit must send only the slot's own fields.
  it('sends a saved slot without the __typename it was read with', () => {
    const slot = { __typename: 'PricingSlot', start_time: '13:00', end_time: '14:00', price: 399, days_of_week: [0, 1, 2, 3, 4, 5, 6] };
    const pricing = makePricing({ model: 'PER_SLOT', slots: [slot] as never });
    const expected = [{ start_time: '13:00', end_time: '14:00', price: 399, days_of_week: [0, 1, 2, 3, 4, 5, 6] }];

    expect(toFormValues(pricing).slots).toEqual(expected);
    expect(savedPricingInput(pricing).slots).toEqual(expected);
    expect(toPricingInput({ ...toFormValues(pricing), slots: [slot] as never }).slots).toEqual(expected);
  });
});

describe('event request status', () => {
  it('labels and colours every status', () => {
    const all = ['OPEN', 'ACCEPTED', 'COUNTERED', 'REJECTED', 'FULFILLED', 'DISMISSED'] as const;
    expect(all.map((s) => eventRequestStatusLabel(t, s))).toEqual(['Open', 'Accepted', 'Offer sent', 'Rejected', 'Fulfilled', 'Dismissed']);
    expect(all.map((s) => EVENT_REQUEST_STATUS_COLOR[s])).toEqual(['warning', 'success', 'info', 'error', 'success', 'default']);
  });

  it('can still be answered only while open or answered with an offer', () => {
    expect(['OPEN', 'ACCEPTED', 'COUNTERED'].every((s) => isAnswerable(s as never))).toBe(true);
    expect(['REJECTED', 'FULFILLED', 'DISMISSED'].some((s) => isAnswerable(s as never))).toBe(false);
  });
});
