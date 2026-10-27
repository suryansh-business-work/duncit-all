import { describe, expect, it } from 'vitest';
import { CALENDAR_OPTIONS, monthRange, presetRange, toDay } from '../../../src/pages/entity-analytics/period-presets';

const TODAY = new Date(2026, 9, 15, 12, 0, 0); // 15 Oct 2026, local

describe('toDay', () => {
  it('writes a local calendar day as yyyy-MM-dd', () => {
    expect(toDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('monthRange', () => {
  it('runs a past month from its first to its last day', () => {
    expect(monthRange(new Date(2026, 1, 10), TODAY)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('stops at today for the current month, so a range never reaches the future', () => {
    expect(monthRange(new Date(2026, 9, 3), TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-15' });
  });

  it('reads the real clock when no today is given', () => {
    expect(monthRange(new Date(2020, 5, 17))).toEqual({ from: '2020-06-01', to: '2020-06-30' });
  });
});

describe('presetRange', () => {
  it('maps this month to its start through today', () => {
    expect(presetRange('thisMonth', TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-15' });
  });

  it('maps last month to the whole previous month, across a year boundary too', () => {
    expect(presetRange('lastMonth', TODAY)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(presetRange('lastMonth', new Date(2026, 0, 9))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('has no range for the presets that wait for the reader to pick dates', () => {
    expect(presetRange('month', TODAY)).toBeNull();
    expect(presetRange('custom', TODAY)).toBeNull();
  });

  it('reads the real clock when no today is given', () => {
    const range = presetRange('thisMonth');
    expect(range?.from).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('offers exactly the four calendar modes', () => {
    expect(CALENDAR_OPTIONS.map((option) => option.mode)).toEqual(['thisMonth', 'lastMonth', 'month', 'custom']);
  });
});
