import { AppInsightDayModel } from '../appInsights/appInsights.model';
import { REVIEW_METRICS, type AppInsightDimension, type AppInsightStore } from '../appInsights/appInsights.metrics';
import { bucketOfDay, dayKeyIn, type AnalyticsWindow } from './window';
import type { AnalyticsSlice } from './shapes';

/**
 * Reading App Insights' stored history for one dashboard period.
 *
 * Store days are the stores' own calendar days; a period is turned into the
 * first and last day it covers in the admin's zone, and rows are matched on
 * those day strings. Three kinds of number are read three ways, never mixed:
 * a COUNT of the day is added up, a LEVEL (active devices, lifetime installs,
 * Google's lifetime rating) is read on the last day that has it, and an
 * average of the day is averaged.
 */

export interface DayRange {
  from: string;
  to: string;
}

/** The period's days and its comparison period's, inclusive. */
export function windowDays(window: AnalyticsWindow): { current: DayRange; previous: DayRange } {
  const last = (to: Date) => dayKeyIn(new Date(to.getTime() - 1), window.zone);
  return {
    current: { from: dayKeyIn(window.from, window.zone), to: last(window.to) },
    previous: { from: dayKeyIn(window.prevFrom, window.zone), to: last(window.prevTo) },
  };
}

export interface DayRow {
  day: string;
  m: Record<string, number>;
}

const inside = (day: string, range: DayRange) => day >= range.from && day <= range.to;

/** One store's whole-app rows for the period and its comparison period, oldest first. */
export async function loadTotals(store: AppInsightStore, window: AnalyticsWindow): Promise<DayRow[]> {
  const { current, previous } = windowDays(window);
  return AppInsightDayModel.find({
    store,
    dimension: 'TOTAL',
    $or: [{ day: { $gte: current.from, $lte: current.to } }, { day: { $gte: previous.from, $lte: previous.to } }],
  })
    .select('day m')
    .sort({ day: 1 })
    .lean<DayRow[]>();
}

const valueOf = (row: DayRow, metric: string): number | undefined => {
  const value = row.m?.[metric];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

/** Whether any row in the range carries the metric — no data is not the same as zero. */
export const hasIn = (rows: readonly DayRow[], metric: string, range: DayRange) =>
  rows.some((row) => inside(row.day, range) && valueOf(row, metric) !== undefined);

export const sumIn = (rows: readonly DayRow[], metric: string, range: DayRange) =>
  rows.reduce((sum, row) => sum + (inside(row.day, range) ? (valueOf(row, metric) ?? 0) : 0), 0);

/** The value on the last day in the range that has one; null when none does. */
export function lastIn(rows: readonly DayRow[], metric: string, range: DayRange): number | null {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (!row || !inside(row.day, range)) continue;
    const value = valueOf(row, metric);
    if (value !== undefined) return value;
  }
  return null;
}

/** The mean over the days in the range that have the metric; null when none does. */
export function meanIn(rows: readonly DayRow[], metric: string, range: DayRange): number | null {
  let total = 0;
  let count = 0;
  for (const row of rows) {
    const value = inside(row.day, range) ? valueOf(row, metric) : undefined;
    if (value === undefined) continue;
    total += value;
    count += 1;
  }
  return count > 0 ? total / count : null;
}

export type SeriesMode = 'sum' | 'last' | 'mean';

/** One value per bucket of the period: the bucket's sum, its last day's level, or its mean. */
export function seriesOf(rows: readonly DayRow[], metric: string, window: AnalyticsWindow, mode: SeriesMode): number[] {
  const { current } = windowDays(window);
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const value = inside(row.day, current) ? valueOf(row, metric) : undefined;
    if (value === undefined) continue;
    const bucket = bucketOfDay(row.day, window.granularity);
    groups.set(bucket, [...(groups.get(bucket) ?? []), value]);
  }
  return window.buckets.map((bucket) => {
    const values = groups.get(bucket);
    if (!values || values.length === 0) return 0;
    if (mode === 'last') return values.at(-1) ?? 0;
    const total = values.reduce((sum, value) => sum + value, 0);
    return mode === 'mean' ? Math.round((total / values.length) * 100) / 100 : total;
  });
}

export interface ReviewStats {
  count: number;
  /** Mean star of the reviews; null with none. */
  average: number | null;
  /** Reviews per star, 1 to 5. */
  byStar: number[];
}

/** The reviews received in the range: how many, their mean star and per-star counts. */
export function reviewStats(rows: readonly DayRow[], range: DayRange): ReviewStats {
  const byStar = REVIEW_METRICS.map((metric) => sumIn(rows, metric, range));
  const count = byStar.reduce((sum, n) => sum + n, 0);
  const stars = byStar.reduce((sum, n, i) => sum + n * (i + 1), 0);
  return { count, average: count > 0 ? Math.round((stars / count) * 100) / 100 : null, byStar };
}

/** The star distribution as ordered slices '1'…'5'. */
export const starSlices = (stats: ReviewStats): AnalyticsSlice[] =>
  stats.byStar.map((value, i) => ({ key: String(i + 1), label: null, value }));

interface SliceQuery {
  store: AppInsightStore;
  dimension: AppInsightDimension;
  metric: string;
  range: DayRange;
  limit: number;
  /** 'sum' adds the days up; 'last' reads each key's latest day (a level). */
  mode: 'sum' | 'last';
}

/** Each slice key's value over the range, largest first. */
export async function sliceTotals(query: SliceQuery): Promise<Array<{ key: string; value: number }>> {
  const field = `$m.${query.metric}`;
  const group =
    query.mode === 'sum' ? { _id: '$key', value: { $sum: field } } : { _id: '$key', value: { $first: field } };
  const rows = await AppInsightDayModel.aggregate<{ _id: string; value: number }>([
    {
      $match: {
        store: query.store,
        dimension: query.dimension,
        day: { $gte: query.range.from, $lte: query.range.to },
        [`m.${query.metric}`]: { $type: 'number' },
      },
    },
    ...(query.mode === 'last' ? [{ $sort: { day: -1 as const } }] : []),
    { $group: group },
    { $match: { value: { $gt: 0 } } },
    { $sort: { value: -1, _id: 1 } },
    { $limit: query.limit },
  ]);
  return rows.map((row) => ({ key: String(row._id), value: row.value }));
}

/** Several metrics' totals per slice key, for a ranking table. */
export async function sliceMetrics(
  store: AppInsightStore,
  dimension: AppInsightDimension,
  metrics: readonly string[],
  range: DayRange
): Promise<Map<string, Record<string, number>>> {
  const group: { _id: string } & Record<string, unknown> = { _id: '$key' };
  for (const metric of metrics) group[metric] = { $sum: { $ifNull: [`$m.${metric}`, 0] } };
  const rows = await AppInsightDayModel.aggregate<Record<string, number> & { _id: string }>([
    { $match: { store, dimension, day: { $gte: range.from, $lte: range.to } } },
    { $group: group },
  ]);
  return new Map(rows.map(({ _id, ...values }) => [String(_id), values]));
}

/** `{ key, value }` rows as slices — the key is the label's source (a country code, a version). */
export const asSlices = (rows: ReadonlyArray<{ key: string; value: number }>): AnalyticsSlice[] =>
  rows.map((row) => ({ key: row.key, label: null, value: row.value }));
