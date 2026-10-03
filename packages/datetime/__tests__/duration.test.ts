import { describe, expect, it } from 'vitest';
import { formatDurationBetween } from '../src/duration';

const start = new Date('2026-06-07T12:00:00Z');
const at = (iso: string) => new Date(iso);

describe('formatDurationBetween', () => {
  it('returns null when either side is missing or not a real date', () => {
    expect(formatDurationBetween(null, start)).toBeNull();
    expect(formatDurationBetween(start, null)).toBeNull();
    expect(formatDurationBetween(new Date(Number.NaN), start)).toBeNull();
    expect(formatDurationBetween(start, new Date('bad'))).toBeNull();
  });

  it('returns null when the end is not after the start', () => {
    expect(formatDurationBetween(start, start)).toBeNull();
    expect(formatDurationBetween(start, at('2026-06-07T11:00:00Z'))).toBeNull();
  });

  it('returns null when the gap rounds down to zero minutes', () => {
    expect(formatDurationBetween(start, at('2026-06-07T12:00:20Z'))).toBeNull();
  });

  it('formats minutes, hours and days, dropping the zero parts', () => {
    expect(formatDurationBetween(start, at('2026-06-07T12:45:00Z'))).toBe('45m');
    expect(formatDurationBetween(start, at('2026-06-07T14:00:00Z'))).toBe('2h');
    expect(formatDurationBetween(start, at('2026-06-07T14:30:00Z'))).toBe('2h 30m');
    expect(formatDurationBetween(start, at('2026-06-09T15:00:00Z'))).toBe('2d 3h');
    expect(formatDurationBetween(start, at('2026-06-08T12:00:00Z'))).toBe('1d');
    expect(formatDurationBetween(start, at('2026-06-08T12:05:00Z'))).toBe('1d 5m');
  });

  it('rounds a partial minute to the nearest whole minute', () => {
    expect(formatDurationBetween(start, at('2026-06-07T12:00:40Z'))).toBe('1m');
  });
});
