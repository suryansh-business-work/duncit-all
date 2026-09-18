import { describe, expect, it } from 'vitest';
import { dateToTimeOfDay, timeOfDayToDate } from '../src/time-of-day';

describe('timeOfDayToDate', () => {
  it('puts the configured hours and minutes on today', () => {
    const date = timeOfDayToDate('09:30', '03:00');
    expect([date.getHours(), date.getMinutes(), date.getSeconds()]).toEqual([9, 30, 0]);
  });

  it('uses the fallback when nothing is configured', () => {
    const date = timeOfDayToDate('', '03:00');
    expect([date.getHours(), date.getMinutes()]).toEqual([3, 0]);
  });

  it('reads an unparseable part as zero rather than an invalid date', () => {
    const date = timeOfDayToDate('xx:yy', '03:00');
    expect([date.getHours(), date.getMinutes()]).toEqual([0, 0]);
  });
});

describe('dateToTimeOfDay', () => {
  it('writes the picker value as zero-padded HH:mm', () => {
    const date = new Date(2026, 8, 18, 7, 5);
    expect(dateToTimeOfDay(date, '03:00')).toBe('07:05');
  });

  it('falls back for a cleared or invalid picker value', () => {
    expect(dateToTimeOfDay(null, '03:00')).toBe('03:00');
    expect(dateToTimeOfDay(new Date(Number.NaN), '09:00')).toBe('09:00');
  });
});
