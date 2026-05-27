import { describe, expect, it } from 'vitest';
import {
  isInWindow,
  rangeToWindow,
  RANGE_LABELS,
  type DashboardRange,
} from '@/pages/dashboard/dashboardConfig';

describe('RANGE_LABELS', () => {
  it('covers every DashboardRange value', () => {
    const expected: DashboardRange[] = ['today', 'week', 'month', 'year', 'all', 'custom'];
    for (const r of expected) {
      expect(typeof RANGE_LABELS[r]).toBe('string');
    }
  });
});

describe('rangeToWindow', () => {
  it('returns an empty window for "all"', () => {
    expect(rangeToWindow('all', {})).toEqual({});
  });

  it('honours the custom window verbatim', () => {
    const custom = { from: new Date('2026-01-01'), to: new Date('2026-01-31') };
    expect(rangeToWindow('custom', custom)).toEqual(custom);
  });

  it('builds a window ending at "now" for each preset range', () => {
    for (const r of ['today', 'week', 'month', 'year'] as DashboardRange[]) {
      const w = rangeToWindow(r, {});
      expect(w.to).toBeInstanceOf(Date);
      expect(w.from).toBeInstanceOf(Date);
      expect(w.from!.getTime()).toBeLessThan(w.to!.getTime());
    }
  });

  it('falls through the default branch when given an unknown range', () => {
    // @ts-expect-error — exercising the default arm.
    expect(rangeToWindow('quarter', {})).toEqual({});
  });
});

describe('isInWindow', () => {
  const window = {
    from: new Date('2026-05-01T00:00:00Z'),
    to: new Date('2026-05-31T23:59:59Z'),
  };

  it('returns false for null / empty / invalid timestamps', () => {
    expect(isInWindow(null, window)).toBe(false);
    expect(isInWindow(undefined, window)).toBe(false);
    expect(isInWindow('not-a-date', window)).toBe(false);
  });

  it('returns true for timestamps inside the window', () => {
    expect(isInWindow('2026-05-15T10:00:00Z', window)).toBe(true);
  });

  it('returns false for timestamps before / after the window', () => {
    expect(isInWindow('2026-04-30T23:59:59Z', window)).toBe(false);
    expect(isInWindow('2026-06-01T00:00:00Z', window)).toBe(false);
  });

  it('treats an empty window as "always inside"', () => {
    expect(isInWindow('2026-05-15T10:00:00Z', {})).toBe(true);
  });
});
