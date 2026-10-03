import { describe, expect, it } from 'vitest';
import { trendBarPercents, trendPeak, type BrandAnalyticsPoint } from '../src/brand/analytics/queries';

const day = (date: string, orders: number): BrandAnalyticsPoint => ({ date, orders, gross_revenue: orders * 1000 });

describe('trendPeak', () => {
  it('is the busiest single day of the window', () => {
    expect(trendPeak([day('2026-10-01', 3), day('2026-10-02', 11), day('2026-10-03', 7)])).toBe(11);
  });

  it('is 0 for a window with no sales, and for no days at all', () => {
    expect(trendPeak([day('2026-10-01', 0), day('2026-10-02', 0)])).toBe(0);
    expect(trendPeak([])).toBe(0);
  });
});

describe('trendBarPercents', () => {
  it('scales every day to the busiest one, rounded to a whole percent', () => {
    expect(trendBarPercents([day('2026-10-01', 1), day('2026-10-02', 3), day('2026-10-03', 2)])).toEqual([
      33, 100, 67,
    ]);
  });

  it('draws every bar flat when nothing sold, instead of dividing by zero', () => {
    expect(trendBarPercents([day('2026-10-01', 0), day('2026-10-02', 0)])).toEqual([0, 0]);
  });
});
