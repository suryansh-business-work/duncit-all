import { describe, expect, it } from 'vitest';
import { generateRecurringSlots } from '../src/recurring/generate-recurring-slots';
import type { RecurringConfig, VenueSettingsLike } from '../src/recurring/types';

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
  wholeDay: false,
  timeSlots: [{ start: '13:00', end: '14:00' }],
  spaces: [{ label: 'Hall', capacity: 100, price: 399 }],
  bufferMinutes: 0,
  skipWeeklyOff: true,
  skipHolidays: true,
  ...over,
});

describe('generateRecurringSlots — validation', () => {
  it('flags missing dates, empty weekdays, bad time order and venue hours', () => {
    expect(generateRecurringSlots(config({ startDate: null }), settings(), NOW).errors).toContain('pickDates');
    expect(
      generateRecurringSlots(config({ startDate: new Date(2026, 6, 12), endDate: new Date(2026, 6, 6) }), settings(), NOW)
        .errors,
    ).toContain('endDateAfterStart');
    expect(generateRecurringSlots(config({ weekdays: [] }), settings(), NOW).errors).toContain('pickWeekday');
    expect(
      generateRecurringSlots(config({ timeSlots: [{ start: '15:00', end: '14:00' }] }), settings(), NOW).errors,
    ).toContain('endAfterStart');
    expect(
      generateRecurringSlots(config({ timeSlots: [{ start: '08:00', end: '09:30' }] }), settings(), NOW).errors,
    ).toContain('beforeOpen');
    expect(
      generateRecurringSlots(config({ timeSlots: [{ start: '22:00', end: '23:30' }] }), settings(), NOW).errors,
    ).toContain('afterClose');
    expect(generateRecurringSlots(config({ startDate: null }), settings(), NOW).slots).toHaveLength(0);
  });

  it('skips the operating-hours checks when the venue hours are not HH:mm', () => {
    const hours = settings({ operating_hours: { open: '', close: '' } });
    expect(generateRecurringSlots(config({ timeSlots: [{ start: '00:30', end: '23:30' }] }), hours, NOW).errors).toEqual([]);
  });

  it('rejects a time that is not HH:mm before judging it', () => {
    expect(
      generateRecurringSlots(config({ timeSlots: [{ start: '9am', end: '10:00' }] }), settings(), NOW).errors,
    ).toEqual(['invalidTime']);
  });

  it('requires at least one time slot and one priced space', () => {
    expect(generateRecurringSlots(config({ timeSlots: [] }), settings(), NOW).errors).toContain('addTimeSlot');
    expect(generateRecurringSlots(config({ spaces: [] }), settings(), NOW).errors).toContain('addSpace');
    expect(
      generateRecurringSlots(config({ spaces: [{ label: 'Hall', capacity: 100, price: -5 }] }), settings(), NOW).errors,
    ).toContain('negativePrice');
  });

  it('rejects overlapping time slots and enforces the buffer gap', () => {
    const overlap = generateRecurringSlots(
      config({
        timeSlots: [
          { start: '09:00', end: '10:00' },
          { start: '09:30', end: '10:30' },
        ],
      }),
      settings(),
      NOW,
    );
    expect(overlap.errors).toContain('overlap');

    const tooClose = generateRecurringSlots(
      config({
        bufferMinutes: 15,
        timeSlots: [
          { start: '09:00', end: '10:00' },
          { start: '10:05', end: '11:00' },
        ],
      }),
      settings(),
      NOW,
    );
    expect(tooClose.errors).toContain('bufferGap');

    const spaced = generateRecurringSlots(
      config({
        bufferMinutes: 15,
        timeSlots: [
          { start: '10:30', end: '11:00' },
          { start: '09:00', end: '10:00' },
        ],
      }),
      settings(),
      NOW,
    );
    expect(spaced.errors).toEqual([]);
  });
});

describe('generateRecurringSlots — generation', () => {
  it('creates one slot per weekday, carrying the space label + capacity', () => {
    const { slots, summary } = generateRecurringSlots(config(), settings(), NOW);
    expect(slots).toHaveLength(7);
    expect(summary.total).toBe(7);
    expect(summary.estimatedRevenue).toBe(7 * 399);
    expect(slots[0]?.space_label).toBe('Hall');
    expect(slots[0]?.capacity).toBe(100);
    expect(summary.bySpace.Hall?.count).toBe(7);
    expect(summary.bySpace.Hall?.price).toBe(399);
  });

  it('multiplies slots across time ranges and spaces', () => {
    const res = generateRecurringSlots(
      config({
        timeSlots: [
          { start: '13:00', end: '14:00' },
          { start: '15:00', end: '16:00' },
        ],
        spaces: [
          { label: 'Banquet hall', capacity: 120, price: 899 },
          { label: 'Rooftop', capacity: 40, price: 499 },
        ],
      }),
      settings(),
      NOW,
    );
    // 7 days × 2 time ranges × 2 spaces.
    expect(res.slots).toHaveLength(28);
    expect(res.summary.bySpace['Banquet hall']?.count).toBe(14);
    expect(res.summary.bySpace.Rooftop?.count).toBe(14);
    expect(res.summary.estimatedRevenue).toBe(14 * 899 + 14 * 499);
  });

  it('keeps only the chosen weekdays', () => {
    const { slots } = generateRecurringSlots(config({ weekdays: [1, 3, 5] }), settings(), NOW);
    expect(slots).toHaveLength(3);
  });

  it('skips weekly-off days and holidays when enabled', () => {
    const off = generateRecurringSlots(config(), settings({ weekly_off_days: [0] }), NOW);
    expect(off.summary.skippedWeeklyOff).toBe(1);
    expect(off.slots).toHaveLength(6);

    const holiday = generateRecurringSlots(config(), settings({ holidays: ['2026-07-08'] }), NOW);
    expect(holiday.summary.skippedHolidays).toBe(1);
    expect(holiday.slots).toHaveLength(6);
  });

  it('caps the advance window at 60 days even when the venue configures more', () => {
    const res = generateRecurringSlots(
      config({ startDate: new Date(2026, 6, 1), endDate: new Date(2026, 11, 31) }),
      settings({ rules: { max_advance_days: 90 } }),
      NOW,
    );
    // Every generated slot is within the hard 60-day cap despite the configured 90.
    const cap60 = new Date(NOW.getTime() + 60 * 86_400_000);
    expect(res.slots.every((s) => new Date(s.start_at) <= cap60)).toBe(true);
    // Slots beyond the 60-day cap were skipped.
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

  it('books each eligible day whole when wholeDay is on, skipping a day already over and days past the cap', () => {
    const whole = generateRecurringSlots(
      config({ wholeDay: true, timeSlots: [], startDate: new Date(2026, 5, 30), endDate: new Date(2026, 6, 3) }),
      settings({ rules: { max_advance_days: 1 } }),
      NOW,
    );
    // Jun 30 is over; Jul 1 (today) starts a few minutes from now; Jul 2 sits
    // inside the 1-day cap; Jul 3 is beyond it.
    expect(whole.summary.skippedPast).toBe(1);
    expect(whole.summary.skippedBeyondCap).toBe(1);
    expect(whole.slots).toHaveLength(2);
    expect(whole.slots.every((s) => s.whole_day)).toBe(true);
    expect(whole.slots[0]?.start_at).toBe(new Date(2026, 6, 1, 6, 5).toISOString());
  });

  it('reads the real clock when no "now" is passed', () => {
    const res = generateRecurringSlots(config({ startDate: new Date(2000, 0, 1), endDate: new Date(2000, 0, 1) }), settings());
    expect(res.errors).toEqual([]);
    expect(res.summary.skippedPast).toBe(1);
  });
});
