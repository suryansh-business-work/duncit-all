import { clampDays, fillTrend } from '../../ecommBrand.analytics';

describe('clampDays', () => {
  it.each([
    [undefined, 30],
    [null, 30],
    [0, 30],
    [-7, 30],
    [Number.NaN, 30],
  ])('falls back to the 30-day default for %s', (input, expected) => {
    expect(clampDays(input)).toBe(expected);
  });

  it('keeps whole days inside 1–365 and truncates fractions', () => {
    expect(clampDays(1)).toBe(1);
    expect(clampDays(7)).toBe(7);
    expect(clampDays(7.9)).toBe(7);
    expect(clampDays(365)).toBe(365);
  });

  it('caps a longer window at a year', () => {
    expect(clampDays(366)).toBe(365);
    expect(clampDays(10_000)).toBe(365);
  });
});

describe('fillTrend', () => {
  const since = new Date('2026-03-30T00:00:00.000Z');

  it('returns every UTC day of the window oldest first, across a month boundary', () => {
    expect(fillTrend([], since, 4).map((p) => p.date)).toEqual([
      '2026-03-30',
      '2026-03-31',
      '2026-04-01',
      '2026-04-02',
    ]);
  });

  it('zero-fills the days nothing sold and rounds revenue to paise', () => {
    const trend = fillTrend(
      [
        { _id: '2026-03-31', orders: 2, gross: 249.999 },
        { _id: '2026-04-02', orders: 1, gross: 100 },
      ],
      since,
      4
    );
    expect(trend).toEqual([
      { date: '2026-03-30', orders: 0, gross_revenue: 0 },
      { date: '2026-03-31', orders: 2, gross_revenue: 250 },
      { date: '2026-04-01', orders: 0, gross_revenue: 0 },
      { date: '2026-04-02', orders: 1, gross_revenue: 100 },
    ]);
  });

  it('ignores aggregated days that fall outside the window', () => {
    const trend = fillTrend(
      [
        { _id: '2026-03-29', orders: 9, gross: 900 },
        { _id: '2026-04-05', orders: 9, gross: 900 },
      ],
      since,
      2
    );
    expect(trend).toEqual([
      { date: '2026-03-30', orders: 0, gross_revenue: 0 },
      { date: '2026-03-31', orders: 0, gross_revenue: 0 },
    ]);
  });
});
