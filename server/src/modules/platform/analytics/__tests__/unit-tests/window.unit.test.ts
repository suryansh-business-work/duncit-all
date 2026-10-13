jest.mock('@utils/app-time', () => ({ getAppTimeZone: () => 'Asia/Kolkata' }));

import {
  bucketOfDay,
  bucketSeries,
  cumulative,
  dayKeyExpr,
  dayTotals,
  distinctSeries,
  inEitherPeriod,
  inRange,
  resolvePeriod,
  resolveWindow,
  seriesFromDays,
  type AnalyticsWindow,
} from '../../entity/window';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-03-15T06:30:00Z');

const win = (over: Partial<AnalyticsWindow> = {}): AnalyticsWindow => ({
  days: 7,
  from: new Date('2026-03-08T00:00:00Z'),
  to: NOW,
  prevFrom: new Date('2026-03-01T00:00:00Z'),
  prevTo: new Date('2026-03-08T00:00:00Z'),
  compare: 'PREVIOUS',
  city: null,
  granularity: 'DAY',
  zone: 'UTC',
  buckets: ['2026-03-08', '2026-03-09', '2026-03-10'],
  ...over,
});

describe('bucketOfDay', () => {
  it('keeps the day for DAY, the Monday for WEEK and the first for MONTH', () => {
    expect(bucketOfDay('2026-03-12', 'DAY')).toBe('2026-03-12');
    expect(bucketOfDay('2026-03-12', 'MONTH')).toBe('2026-03-01');
    // 2026-03-12 is a Thursday; its Monday is the 9th. A Sunday belongs to the Monday before it.
    expect(bucketOfDay('2026-03-12', 'WEEK')).toBe('2026-03-09');
    expect(bucketOfDay('2026-03-15', 'WEEK')).toBe('2026-03-09');
    expect(bucketOfDay('2026-03-09', 'WEEK')).toBe('2026-03-09');
  });
});

describe('resolvePeriod', () => {
  it('defaults to 30 days compared with the period before, cut in the app zone', () => {
    const w = resolvePeriod({}, NOW);
    expect(w.days).toBe(30);
    expect(w.compare).toBe('PREVIOUS');
    expect(w.granularity).toBe('DAY');
    expect(w.zone).toBe('Asia/Kolkata');
    expect(w.to).toEqual(NOW);
    expect(w.from.getTime()).toBe(NOW.getTime() - 30 * DAY);
    expect(w.prevTo).toEqual(w.from);
    expect(w.prevFrom.getTime()).toBe(w.from.getTime() - 30 * DAY);
    expect(w.city).toBeNull();
    expect(w.buckets.length).toBeGreaterThan(4);
  });

  it('clamps a preset to 7..365 days and picks the granularity from the length', () => {
    expect(resolvePeriod({ days: 1 }, NOW).days).toBe(7);
    expect(resolvePeriod({ days: 7 }, NOW).granularity).toBe('DAY');
    expect(resolvePeriod({ days: 9999 }, NOW).days).toBe(365);
    expect(resolvePeriod({ days: 9999 }, NOW).granularity).toBe('MONTH');
    expect(resolveWindow(90, NOW).granularity).toBe('WEEK');
    expect(resolveWindow(null, NOW).days).toBe(30);
  });

  it('compares with the same dates a year earlier when asked', () => {
    const w = resolvePeriod({ days: 7, compare: 'YEAR' }, NOW);
    expect(w.compare).toBe('YEAR');
    expect(w.prevTo.toISOString()).toBe('2025-03-15T06:30:00.000Z');
    expect(w.prevFrom.toISOString()).toBe('2025-03-08T06:30:00.000Z');
  });

  it('reads a calendar range from the start of the first day to the end of the last, in the zone', () => {
    const w = resolvePeriod({ from: '2026-03-01', to: '2026-03-03' }, NOW);
    expect(w.from.toISOString()).toBe('2026-02-28T18:30:00.000Z');
    expect(w.to.toISOString()).toBe('2026-03-03T18:30:00.000Z');
    expect(w.days).toBe(3);
    expect(w.buckets).toEqual(expect.arrayContaining(['2026-03-01', '2026-03-02', '2026-03-03']));
  });

  it('never lets a range end after now', () => {
    const w = resolvePeriod({ from: '2026-03-10', to: '2026-03-30' }, NOW);
    expect(w.to).toEqual(NOW);
  });

  it('refuses malformed, inverted, future and over-long ranges and an unknown city', () => {
    expect(() => resolvePeriod({ from: '1 March', to: '2026-03-03' }, NOW)).toThrow(/yyyy-MM-dd/);
    expect(() => resolvePeriod({ from: '2026-03-05', to: '2026-03-01' }, NOW)).toThrow(/on or before/);
    expect(() => resolvePeriod({ from: '2026-04-01', to: '2026-04-02' }, NOW)).toThrow(/on or before/);
    expect(() => resolvePeriod({ from: '2024-01-01', to: '2026-03-01' }, NOW)).toThrow(/at most a year/);
    expect(() => resolvePeriod({ city: 'not-an-id' }, NOW)).toThrow(/not one Duncit has/);
  });

  it('keeps a valid city id and treats an empty one as every city', () => {
    const id = '64b7f0c2a1b2c3d4e5f60718';
    expect(resolvePeriod({ city: id }, NOW).city).toBe(id);
    expect(resolvePeriod({ city: '' }, NOW).city).toBeNull();
  });
});

describe('series helpers', () => {
  it('seriesFromDays sums days into their bucket and zero-fills the gaps', () => {
    const w = win({ granularity: 'WEEK', buckets: ['2026-03-02', '2026-03-09', '2026-03-16'] });
    const rows = [
      { _id: '2026-03-10', value: 2 },
      { _id: '2026-03-12', value: 3 },
      { _id: '2026-03-02', value: 1 },
    ];
    expect(seriesFromDays(rows, w)).toEqual([1, 5, 0]);
  });

  it('dayTotals counts one per row by default and sums a value function by day', () => {
    const rows = [
      { at: new Date('2026-03-08T22:00:00Z'), n: 4 },
      { at: new Date('2026-03-08T01:00:00Z'), n: 6 },
      { at: new Date('2026-03-09T01:00:00Z'), n: 1 },
    ];
    expect(dayTotals(rows, (r) => r.at, 'UTC')).toEqual([
      { _id: '2026-03-08', value: 2 },
      { _id: '2026-03-09', value: 1 },
    ]);
    expect(dayTotals(rows, (r) => r.at, 'UTC', (r) => r.n)).toEqual([
      { _id: '2026-03-08', value: 10 },
      { _id: '2026-03-09', value: 1 },
    ]);
    // 22:00Z is already the next calendar day in Kolkata.
    expect(dayTotals(rows.slice(0, 1), (r) => r.at, 'Asia/Kolkata')).toEqual([{ _id: '2026-03-09', value: 1 }]);
  });

  it('cumulative starts from the base', () => {
    expect(cumulative(10, [1, 0, 4])).toEqual([11, 11, 15]);
    expect(cumulative(5, [])).toEqual([]);
  });

  it('distinctSeries counts each id once per bucket', () => {
    const rows = [
      { day: '2026-03-08', id: 'a' },
      { day: '2026-03-08', id: 'a' },
      { day: '2026-03-08', id: 'b' },
      { day: '2026-03-10', id: 'a' },
    ];
    expect(distinctSeries(rows, win())).toEqual([2, 0, 1]);
  });

  it('bucketSeries reduces the rows of each bucket and reads 0 for an empty one', () => {
    const rows = [
      { at: new Date('2026-03-08T10:00:00Z'), v: 3 },
      { at: new Date('2026-03-08T11:00:00Z'), v: 9 },
      { at: new Date('2026-03-10T11:00:00Z'), v: 2 },
    ];
    const peak = bucketSeries(rows, (r) => r.at, win(), (g) => Math.max(...g.map((r) => r.v)));
    expect(peak).toEqual([9, 0, 2]);
  });
});

describe('mongo helpers', () => {
  it('builds the day expression, the range and the either-period match', () => {
    expect(dayKeyExpr('created_at', 'UTC')).toEqual({
      $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone: 'UTC' },
    });
    const w = win();
    expect(inRange(w.from, w.to)).toEqual({ $gte: w.from, $lt: w.to });
    expect(inEitherPeriod('created_at', w)).toEqual({
      $or: [{ created_at: { $gte: w.from, $lt: w.to } }, { created_at: { $gte: w.prevFrom, $lt: w.prevTo } }],
    });
  });
});
