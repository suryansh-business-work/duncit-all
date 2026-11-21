import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POD_MIN_ADVANCE_DAYS,
  cleanPodMinAdvanceDays,
  meetsPodMinAdvance,
  podMinAdvanceDaysOrNull,
  podMinAdvanceWindow,
  startsWithinPodMinAdvance,
} from '../src/pod-min-advance';
import { dayKeyInZone } from '../src/zone-day';

const KOLKATA = 'Asia/Kolkata';
// 10 Nov 2026, 14:00 in Kolkata.
const NOV_10_AFTERNOON = Date.parse('2026-11-10T08:30:00.000Z');

describe('podMinAdvanceWindow', () => {
  it('opens on the day `days` after today, from local midnight (10 Nov + 5 → 15 Nov)', () => {
    expect(podMinAdvanceWindow(NOV_10_AFTERNOON, KOLKATA, 5)).toEqual({
      day: '2026-11-15',
      startMs: Date.parse('2026-11-14T18:30:00.000Z'),
    });
  });

  it('counts "today" on the admin zone’s clock, not UTC', () => {
    // 23:00 UTC on 9 Nov is already 04:30 on 10 Nov in Kolkata.
    const lateUtc = Date.parse('2026-11-09T23:00:00.000Z');
    expect(podMinAdvanceWindow(lateUtc, KOLKATA, 2).day).toBe('2026-11-12');
    expect(podMinAdvanceWindow(lateUtc, 'UTC', 2).day).toBe('2026-11-11');
  });

  it('rolls over a month and a year end', () => {
    expect(podMinAdvanceWindow(Date.parse('2026-12-30T06:00:00.000Z'), KOLKATA, 3).day).toBe('2027-01-02');
  });

  it('holds an out-of-range day count to 1–30 before counting', () => {
    expect(podMinAdvanceWindow(NOV_10_AFTERNOON, KOLKATA, 0).day).toBe('2026-11-11');
    expect(podMinAdvanceWindow(NOV_10_AFTERNOON, KOLKATA, 99).day).toBe('2026-12-10');
  });
});

describe('meetsPodMinAdvance', () => {
  const window = podMinAdvanceWindow(NOV_10_AFTERNOON, KOLKATA, 5);

  it('accepts a start from the first allowed midnight onwards', () => {
    expect(meetsPodMinAdvance(window.startMs, window)).toBe(true);
    expect(meetsPodMinAdvance(Date.parse('2026-11-20T12:00:00.000Z'), window)).toBe(true);
  });

  it('refuses the last minute of the day before, and anything unparseable', () => {
    expect(meetsPodMinAdvance(window.startMs - 60_000, window)).toBe(false);
    expect(meetsPodMinAdvance(Number.NaN, window)).toBe(false);
  });
});

describe('startsWithinPodMinAdvance', () => {
  const slots = [
    { id: 'too-soon', start_at: '2026-11-14T12:00:00.000Z' },
    { id: 'first-day', start_at: '2026-11-14T18:30:00.000Z' },
    { id: 'later', start_at: '2026-11-21T10:00:00.000Z' },
  ];

  it('drops what starts before the window and keeps the rest in order', () => {
    const window = podMinAdvanceWindow(NOV_10_AFTERNOON, KOLKATA, 5);
    expect(startsWithinPodMinAdvance(slots, window).map((slot) => slot.id)).toEqual(['first-day', 'later']);
  });

  it('keeps everything while there is no window (rule not known yet)', () => {
    expect(startsWithinPodMinAdvance(slots, null)).toEqual(slots);
  });
});

describe('cleanPodMinAdvanceDays', () => {
  it('keeps a whole number inside 1–30', () => {
    expect(cleanPodMinAdvanceDays(1)).toBe(1);
    expect(cleanPodMinAdvanceDays(30)).toBe(30);
    expect(cleanPodMinAdvanceDays('7')).toBe(7);
  });

  it('floors a fraction and holds the ends', () => {
    expect(cleanPodMinAdvanceDays(4.9)).toBe(4);
    expect(cleanPodMinAdvanceDays(0)).toBe(1);
    expect(cleanPodMinAdvanceDays(-3)).toBe(1);
    expect(cleanPodMinAdvanceDays(31)).toBe(30);
  });

  it('reads unset or non-numeric values as the default of 2', () => {
    expect(DEFAULT_POD_MIN_ADVANCE_DAYS).toBe(2);
    for (const value of [null, undefined, '', 'soon', Number.NaN]) {
      expect(cleanPodMinAdvanceDays(value)).toBe(2);
    }
  });
});

describe('podMinAdvanceDaysOrNull', () => {
  it('accepts whole numbers from 1 to 30, typed or numeric', () => {
    expect(podMinAdvanceDaysOrNull(1)).toBe(1);
    expect(podMinAdvanceDaysOrNull('30')).toBe(30);
  });

  it('is null for blank, fractional or out-of-range input', () => {
    for (const value of ['', '   ', 0, 31, 2.5, '1e1x', null]) {
      expect(podMinAdvanceDaysOrNull(value)).toBeNull();
    }
  });
});

describe('dayKeyInZone', () => {
  it('is the calendar day on the zone’s clock', () => {
    const instant = Date.parse('2026-11-09T20:00:00.000Z');
    expect(dayKeyInZone(instant, KOLKATA)).toBe('2026-11-10');
    expect(dayKeyInZone(instant, 'America/New_York')).toBe('2026-11-09');
  });

  it('reads an unknown zone as UTC', () => {
    expect(dayKeyInZone(Date.parse('2026-11-09T20:00:00.000Z'), 'Not/AZone')).toBe('2026-11-09');
  });
});
