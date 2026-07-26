import { describe, expect, it } from 'vitest';
import {
  FALLBACK_DATE_FORMAT,
  FALLBACK_TIME_FORMAT,
  FALLBACK_TIME_ZONE,
  createDateFormatter,
} from '../src/format';

describe('createDateFormatter', () => {
  it('falls back to the documented defaults when settings are empty', () => {
    const f = createDateFormatter();
    expect(f.dateFormat).toBe(FALLBACK_DATE_FORMAT);
    expect(f.timeFormat).toBe(FALLBACK_TIME_FORMAT);
    expect(f.timeZone).toBe(FALLBACK_TIME_ZONE);
  });

  it('uses the SAME time fallback zoned or not, so surfaces never disagree', () => {
    expect(createDateFormatter({ timeZoneAware: true }).timeFormat).toBe(FALLBACK_TIME_FORMAT);
    expect(createDateFormatter().timeFormat).toBe(FALLBACK_TIME_FORMAT);
  });

  it('honours admin patterns and formats in the configured zone', () => {
    const f = createDateFormatter({
      dateFormat: 'yyyy-MM-dd',
      timeFormat: 'HH:mm',
      timeZone: 'Asia/Kolkata',
      timeZoneAware: true,
    });
    // 00:00Z is 05:30 IST on the same day.
    expect(f.formatDate('2026-03-01T00:00:00.000Z')).toBe('2026-03-01');
    expect(f.formatTime('2026-03-01T00:00:00.000Z')).toBe('05:30');
    expect(f.formatDateTime('2026-03-01T00:00:00.000Z')).toBe('2026-03-01 · 05:30');
    expect(f.dayKey('2026-03-01T00:00:00.000Z')).toBe('2026-03-01');
  });

  it('formats in device-local time when not zone-aware', () => {
    const f = createDateFormatter({ dateFormat: 'yyyy-MM-dd' });
    const local = new Date(2026, 2, 1, 12, 0, 0);
    expect(f.formatDate(local)).toBe('2026-03-01');
    // A zone-less ISO string is parsed as local time by parseISO, so the day
    // is stable regardless of the machine's zone.
    expect(f.formatDate('2026-03-01T12:00:00')).toBe('2026-03-01');
  });

  it('returns empty string for missing or invalid input instead of throwing', () => {
    const local = createDateFormatter();
    const zoned = createDateFormatter({ timeZoneAware: true });
    for (const f of [local, zoned]) {
      expect(f.formatDate(null)).toBe('');
      expect(f.formatDate(undefined)).toBe('');
      expect(f.formatDate('')).toBe('');
      expect(f.formatDate('not-a-date')).toBe('');
      expect(f.formatDate(new Date('nope'))).toBe('');
      expect(f.dayLabel(null)).toBe('');
    }
    expect(local.formatDate(1_700_000_000_000)).not.toBe('');
  });

  it('returns empty string when the pattern itself is invalid', () => {
    const f = createDateFormatter({ timeZoneAware: true, timeZone: 'Not/AZone' });
    expect(f.formatDate('2026-03-01T00:00:00.000Z')).toBe('');
  });

  it('dayLabel says Today/Yesterday relative to the CLOCK, not the device', () => {
    // Custom clock frozen on 2030-06-15; the device's real date is irrelevant.
    const f = createDateFormatter({
      dateFormat: 'yyyy-MM-dd',
      timeZone: 'UTC',
      timeZoneAware: true,
      clock: { source: 'CUSTOM', customTime: '2030-06-15T10:00:00.000Z' },
    });
    expect(f.dayLabel('2030-06-15T08:00:00.000Z')).toBe('Today');
    expect(f.dayLabel('2030-06-14T08:00:00.000Z')).toBe('Yesterday');
    expect(f.dayLabel('2030-06-10T08:00:00.000Z')).toBe('2030-06-10');
    expect(f.now().toISOString()).toBe('2030-06-15T10:00:00.000Z');
  });

  it('exposes formatPattern as an escape hatch', () => {
    const f = createDateFormatter({ timeZone: 'UTC', timeZoneAware: true });
    expect(f.formatPattern('2026-03-01T00:00:00.000Z', 'MMM yyyy')).toBe('Mar 2026');
    expect(f.formatPattern(null, 'MMM yyyy')).toBe('');
  });

  it('defaults its clock to the browser source', () => {
    expect(createDateFormatter().clock.source).toBe('BROWSER');
  });
});
