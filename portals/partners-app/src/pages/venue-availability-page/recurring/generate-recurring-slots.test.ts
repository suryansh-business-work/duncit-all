import { describe, expect, it } from 'vitest';
import { generateRecurringSlots } from './generate-recurring-slots';
import type { RecurringConfig, VenueSettingsLike } from './recurring.types';

// 1 Jul 2026 is a Wednesday; 06:00 local keeps weekday math TZ-stable.
const NOW = new Date(2026, 6, 1, 6, 0, 0);

const settings = (over: Partial<VenueSettingsLike> = {}): VenueSettingsLike => ({
  operating_hours: { open: '09:00', close: '23:00' },
  weekly_off_days: [],
  holidays: [],
  rules: { max_advance_days: 60 },
  ...over,
});

const config = (over: Partial<RecurringConfig> = {}): RecurringConfig => ({
  startDate: new Date(2026, 6, 6), // Mon
  endDate: new Date(2026, 6, 12), // Sun
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  startTime: '13:00',
  endTime: '14:00',
  defaultPrice: 399,
  perDayPrice: {},
  skipWeeklyOff: true,
  skipHolidays: true,
  ...over,
});

describe('generateRecurringSlots — validation', () => {
  it('flags missing dates, empty weekdays, bad time order and venue hours', () => {
    expect(generateRecurringSlots(config({ startDate: null }), settings(), NOW).errors).toContain(
      'Pick a start and end date.',
    );
    expect(generateRecurringSlots(config({ weekdays: [] }), settings(), NOW).errors).toContain(
      'Select at least one day to repeat on.',
    );
    expect(
      generateRecurringSlots(config({ startTime: '15:00', endTime: '14:00' }), settings(), NOW).errors,
    ).toContain('End time must be after start time.');
    expect(
      generateRecurringSlots(config({ startTime: '08:00' }), settings(), NOW).errors[0],
    ).toMatch(/before the venue opens/);
    expect(generateRecurringSlots(config({ startDate: null }), settings(), NOW).slots).toHaveLength(0);
  });
});

describe('generateRecurringSlots — generation', () => {
  it('creates one slot per selected weekday in range', () => {
    const { slots, summary } = generateRecurringSlots(config(), settings(), NOW);
    expect(slots).toHaveLength(7);
    expect(summary.total).toBe(7);
    expect(summary.estimatedRevenue).toBe(7 * 399);
  });

  it('keeps only the chosen weekdays', () => {
    const { slots } = generateRecurringSlots(config({ weekdays: [1, 3, 5] }), settings(), NOW);
    expect(slots).toHaveLength(3);
  });

  it('applies per-day price overrides and reflects them in the summary', () => {
    const { summary } = generateRecurringSlots(
      config({ perDayPrice: { 0: 499, 6: 449 } }),
      settings(),
      NOW,
    );
    expect(summary.byWeekday[0].price).toBe(499);
    expect(summary.byWeekday[6].price).toBe(449);
    expect(summary.byWeekday[1].price).toBe(399);
    expect(summary.estimatedRevenue).toBe(5 * 399 + 449 + 499);
  });

  it('skips weekly-off days and holidays when enabled', () => {
    const off = generateRecurringSlots(config(), settings({ weekly_off_days: [0] }), NOW);
    expect(off.summary.skippedWeeklyOff).toBe(1);
    expect(off.slots).toHaveLength(6);

    const holiday = generateRecurringSlots(config(), settings({ holidays: ['2026-07-08'] }), NOW);
    expect(holiday.summary.skippedHolidays).toBe(1);
    expect(holiday.slots).toHaveLength(6);
  });

  it('never promises slots beyond the 60-day server cap, even if the rule is higher', () => {
    const res = generateRecurringSlots(
      config({ startDate: new Date(2026, 6, 1), endDate: new Date(2026, 8, 30) }),
      settings({ rules: { max_advance_days: 120 } }),
      NOW,
    );
    const cap = new Date(NOW.getTime() + 60 * 86_400_000);
    expect(res.slots.every((s) => new Date(s.start_at) <= cap)).toBe(true);
    expect(res.summary.skippedBeyondCap).toBeGreaterThan(0);
  });

  it('skips past slots and slots beyond the advance cap', () => {
    const past = generateRecurringSlots(
      config({ startDate: new Date(2026, 5, 28), endDate: new Date(2026, 6, 2) }),
      settings(),
      NOW,
    );
    expect(past.summary.skippedPast).toBe(3);
    expect(past.slots).toHaveLength(2);

    const capped = generateRecurringSlots(
      config({ startDate: new Date(2026, 6, 2), endDate: new Date(2026, 6, 10) }),
      settings({ rules: { max_advance_days: 3 } }),
      NOW,
    );
    expect(capped.slots).toHaveLength(2);
    expect(capped.summary.skippedBeyondCap).toBe(7);
  });
});
