jest.mock('@utils/app-time', () => ({ getAppTimeZone: () => 'Asia/Kolkata' }));

import { resolvePeriod } from '../../entity/window';
import {
  hasIn,
  lastIn,
  meanIn,
  reviewStats,
  seriesOf,
  starSlices,
  sumIn,
  windowDays,
  type DayRow,
} from '../../entity/appInsights.data';
import { combinedTile, countTile, levelTile, meanTile } from '../../entity/appInsights.kpis';

/** A 7-day window ending 2026-05-08 00:00 IST: days 05-01…05-07, compared with 04-24…04-30. */
const NOW = new Date('2026-05-07T18:30:00Z');
const window = resolvePeriod({ days: 7 }, NOW);
const days = windowDays(window);
const row = (day: string, m: Record<string, number>): DayRow => ({ day, m });

const rows: DayRow[] = [
  row('2026-04-25', { new_installs: 4, active_devices: 100, rating_daily_avg: 3 }),
  row('2026-05-01', { new_installs: 5, active_devices: 120, rating_daily_avg: 4, reviews_5: 2, reviews_1: 1 }),
  row('2026-05-03', { new_installs: 1, rating_daily_avg: 5 }),
  row('2026-05-06', { new_installs: 2, active_devices: 130, reviews_4: 1 }),
];

describe('windowDays', () => {
  it('turns the period and its comparison into inclusive store days in the admin zone', () => {
    expect(days).toEqual({
      current: { from: '2026-05-01', to: '2026-05-07' },
      previous: { from: '2026-04-24', to: '2026-04-30' },
    });
  });
});

describe('reading the history', () => {
  it('adds counts over the days in range only', () => {
    expect(sumIn(rows, 'new_installs', days.current)).toBe(8);
    expect(sumIn(rows, 'new_installs', days.previous)).toBe(4);
  });

  it('tells "no data" from zero', () => {
    expect(hasIn(rows, 'crashes', days.current)).toBe(false);
    expect(hasIn(rows, 'new_installs', days.previous)).toBe(true);
  });

  it('reads a level on the last day that has it, never adding days up', () => {
    expect(lastIn(rows, 'active_devices', days.current)).toBe(130);
    expect(lastIn(rows, 'active_devices', days.previous)).toBe(100);
    expect(lastIn(rows, 'total_installs', days.current)).toBeNull();
  });

  it('averages a daily average over the days that have one', () => {
    expect(meanIn(rows, 'rating_daily_avg', days.current)).toBe(4.5);
    expect(meanIn(rows, 'crashes', days.current)).toBeNull();
  });

  it('lays a metric on the chart buckets as a sum, a level or a mean, zero where nothing was reported', () => {
    expect(window.granularity).toBe('DAY');
    const sums = seriesOf(rows, 'new_installs', window, 'sum');
    expect(sums[window.buckets.indexOf('2026-05-01')]).toBe(5);
    expect(sums[window.buckets.indexOf('2026-05-02')]).toBe(0);
    expect(sums.reduce((a, b) => a + b, 0)).toBe(8);

    const weekly = resolvePeriod({ days: 90 }, NOW);
    const weekRows = [row('2026-05-04', { active_devices: 10 }), row('2026-05-06', { active_devices: 30 })];
    const levels = seriesOf(weekRows, 'active_devices', weekly, 'last');
    const means = seriesOf(weekRows, 'active_devices', weekly, 'mean');
    const week = weekly.buckets.indexOf('2026-05-04');
    expect(levels[week]).toBe(30);
    expect(means[week]).toBe(20);
  });

  it('summarises the reviews of the range: count, mean star and per-star slices', () => {
    const stats = reviewStats(rows, days.current);
    expect(stats).toEqual({ count: 4, average: 3.75, byStar: [1, 0, 0, 1, 2] });
    expect(starSlices(stats).map((s) => [s.key, s.value])).toEqual([
      ['1', 1],
      ['2', 0],
      ['3', 0],
      ['4', 1],
      ['5', 2],
    ]);
    expect(reviewStats([], days.current)).toEqual({ count: 0, average: null, byStar: [0, 0, 0, 0, 0] });
  });
});

describe('tiles', () => {
  it('compares a count only when the history reaches the earlier period', () => {
    expect(countTile('k', rows, 'new_installs', days)).toMatchObject({ value: 8, previous: 4 });
    const onlyNow = rows.filter((r) => r.day >= '2026-05-01');
    expect(countTile('k', onlyNow, 'new_installs', days)).toMatchObject({ value: 8, previous: null });
  });

  it('reads levels and means for their tiles', () => {
    expect(levelTile('k', rows, 'active_devices', days)).toMatchObject({ value: 130, previous: 100 });
    expect(levelTile('k', [], 'active_devices', days)).toMatchObject({ value: 0, previous: null });
    expect(meanTile('k', rows, 'rating_daily_avg', days, { format: 'RATING' })).toMatchObject({
      value: 4.5,
      previous: 3,
      format: 'RATING',
    });
  });

  it('adds two stores, leaving a store with no history at all out of the comparison', () => {
    const apple: DayRow[] = [];
    const tile = combinedTile(
      'ai_new_installs',
      [
        { rows, metric: 'new_installs' },
        { rows: apple, metric: 'first_downloads' },
      ],
      days
    );
    expect(tile).toMatchObject({ value: 8, previous: 4 });
  });

  it('does not compare when one store has numbers now but none for the earlier period', () => {
    const apple = [row('2026-05-02', { first_downloads: 3 })];
    const tile = combinedTile(
      'ai_new_installs',
      [
        { rows, metric: 'new_installs' },
        { rows: apple, metric: 'first_downloads' },
      ],
      days,
      { higherIsBetter: true }
    );
    expect(tile).toMatchObject({ value: 11, previous: null });
  });
});
