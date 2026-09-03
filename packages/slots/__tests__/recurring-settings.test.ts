import { describe, expect, it, vi } from 'vitest';
import { recurringErrorMessage, weekdayLabels } from '../src/recurring/copy';
import {
  DEFAULT_AUTO_EXTEND,
  DEFAULT_VENUE_RULES,
  effectiveMaxAdvance,
  hhmmToDate,
  MAX_ADVANCE_DAYS_CAP,
  parseHHMM,
  readVenueSettings,
  timeToHHMM,
} from '../src/recurring/settings-map';
import type { RecurringErrorCode, VenueSettingsLike } from '../src/recurring/types';

describe('readVenueSettings', () => {
  it('fills every part in for a venue with no settings at all', () => {
    expect(readVenueSettings(undefined)).toEqual({
      operating_hours: { open: '09:00', close: '23:00' },
      weekly_off_days: [],
      holidays: [],
      rules: DEFAULT_VENUE_RULES,
      auto_extend: DEFAULT_AUTO_EXTEND,
    });
  });

  it('keeps what the venue has and defaults only the gaps', () => {
    const view = readVenueSettings({
      operating_hours: { open: '07:30', close: '21:00' },
      weekly_off_days: [1],
      holidays: ['2026-08-15'],
      rules: { buffer_minutes: 15, max_advance_days: 30 },
      auto_extend: { enabled: true, horizon_days: 14 },
    });
    expect(view.operating_hours).toEqual({ open: '07:30', close: '21:00' });
    expect(view.weekly_off_days).toEqual([1]);
    expect(view.holidays).toEqual(['2026-08-15']);
    expect(view.rules).toEqual({ ...DEFAULT_VENUE_RULES, buffer_minutes: 15, max_advance_days: 30 });
    expect(view.auto_extend).toEqual({ ...DEFAULT_AUTO_EXTEND, enabled: true, horizon_days: 14 });
  });
});

describe('HH:mm helpers', () => {
  it('parses HH:mm and reads anything else as midnight', () => {
    expect(parseHHMM('13:45')).toEqual({ hours: 13, minutes: 45 });
    expect(parseHHMM('x')).toEqual({ hours: 0, minutes: 0 });
  });

  it('round-trips a time through a Date', () => {
    const d = hhmmToDate('09:05');
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(5);
    expect(timeToHHMM(d)).toBe('09:05');
  });

  it('prints nothing for a missing or invalid date', () => {
    expect(timeToHHMM(null)).toBe('');
    expect(timeToHHMM(new Date('not a date'))).toBe('');
  });
});

describe('effectiveMaxAdvance', () => {
  it('clamps the venue rule into [1, 60] and reads a missing rule as 60', () => {
    expect(MAX_ADVANCE_DAYS_CAP).toBe(60);
    expect(effectiveMaxAdvance(30)).toBe(30);
    expect(effectiveMaxAdvance(90)).toBe(60);
    expect(effectiveMaxAdvance(0)).toBe(60);
    expect(effectiveMaxAdvance(-4)).toBe(1);
    expect(effectiveMaxAdvance(Number.NaN)).toBe(60);
  });
});

describe('recurringErrorMessage', () => {
  const settings: VenueSettingsLike = {
    operating_hours: { open: '09:00', close: '23:00' },
    weekly_off_days: [],
    holidays: [],
    rules: { max_advance_days: 60, buffer_minutes: 15 },
  };
  const t = vi.fn((key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}:${Object.values(options.vars).join(',')}` : key,
  );

  it('maps every code to its own availability.recurring.* key', () => {
    const plain: RecurringErrorCode[] = [
      'pickDates',
      'endDateAfterStart',
      'pickWeekday',
      'addTimeSlot',
      'invalidTime',
      'endAfterStart',
      'overlap',
      'addSpace',
      'negativePrice',
    ];
    for (const code of plain) expect(recurringErrorMessage(code, t, settings)).toBe(`availability.recurring.${code}`);
  });

  it('hands the venue hours and buffer to the sentences that name them', () => {
    expect(recurringErrorMessage('beforeOpen', t, settings)).toBe('availability.recurring.beforeOpen:09:00');
    expect(recurringErrorMessage('afterClose', t, settings)).toBe('availability.recurring.afterClose:23:00');
    expect(recurringErrorMessage('bufferGap', t, settings)).toBe('availability.recurring.bufferGap:15');
    expect(recurringErrorMessage('bufferGap', t, { ...settings, rules: { max_advance_days: 60 } })).toBe(
      'availability.recurring.bufferGap:0',
    );
  });
});

describe('weekdayLabels', () => {
  it('reads seven short and seven full names, Sunday first', () => {
    const t = vi.fn((key: string) => key);
    const labels = weekdayLabels(t);
    expect(labels.short).toEqual([
      'availability.weekday.sun',
      'availability.weekday.mon',
      'availability.weekday.tue',
      'availability.weekday.wed',
      'availability.weekday.thu',
      'availability.weekday.fri',
      'availability.weekday.sat',
    ]);
    expect(labels.full[0]).toBe('availability.weekdayFull.sunday');
    expect(labels.full[6]).toBe('availability.weekdayFull.saturday');
    expect(labels.full).toHaveLength(7);
  });
});
