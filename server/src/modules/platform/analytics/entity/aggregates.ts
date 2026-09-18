import type { PipelineStage } from 'mongoose';
import { dayKeyExpr, inEitherPeriod, seriesFromDays, type AnalyticsWindow } from './window';
import { total } from './shapes';

/**
 * The aggregation helpers several Analytics pages share: per-day rows for both
 * periods in one query, tallies, and the small reductions over them.
 *
 * One query reads BOTH periods and marks each day with the period it fell in,
 * so a trend and its tile's comparison come from the same read.
 */

export interface PeriodDayKey {
  day: string;
  current: boolean;
}

export interface CountRow {
  _id: PeriodDayKey;
  value: number;
}

export interface PeriodTotals {
  series: number[];
  now: number;
  before: number;
}

/** A row grouped under a string key: a day, a release kind. */
export interface Keyed {
  _id: string;
}

export interface Tally {
  _id: string;
  count: number;
}

/** The default per-day sum: how many rows fell on the day. */
const ROW_COUNT: Record<string, object> = { value: { $sum: 1 } };

/** One `$group` row per calendar day of `field`, marked with the period it fell in. */
export const periodGroup = (
  field: string,
  window: AnalyticsWindow,
  sums: Record<string, object> = ROW_COUNT
): PipelineStage => ({
  $group: { _id: { day: dayKeyExpr(field, window.zone), current: { $gte: [`$${field}`, window.from] } }, ...sums },
});

/** Rows whose `field` falls in either period, summed per day. */
export const perDay = (field: string, window: AnalyticsWindow, sums?: Record<string, object>): PipelineStage[] => [
  { $match: inEitherPeriod(field, window) },
  periodGroup(field, window, sums),
];

/** Per-day rows as this period's trend line plus both periods' totals. */
export function splitPeriod<T extends { _id: PeriodDayKey }>(
  rows: readonly T[],
  window: AnalyticsWindow,
  valueOf: (row: T) => number
): PeriodTotals {
  const current = rows.filter((row) => row._id.current);
  const previous = rows.filter((row) => !row._id.current);
  return {
    series: seriesFromDays(
      current.map((row) => ({ _id: row._id.day, value: valueOf(row) })),
      window
    ),
    now: total(current.map(valueOf)),
    before: total(previous.map(valueOf)),
  };
}

export const countOf = (row: CountRow) => row.value;

/** Rows counted per value of `key` — a field path or an expression. */
export const tallyOf = (key: string | object): PipelineStage.Group => ({ $group: { _id: key, count: { $sum: 1 } } });

/** A tally where each row carries its own weight — clicks per source, messages per channel. */
export function sumBy<T>(rows: readonly T[], keyOf: (row: T) => string, valueOf: (row: T) => number) {
  const sums = new Map<string, number>();
  for (const row of rows) sums.set(keyOf(row), (sums.get(keyOf(row)) ?? 0) + valueOf(row));
  return sums;
}

/** One numeric field of per-day rows, in the shape `seriesFromDays` reads. */
export const column = <K extends string>(rows: ReadonlyArray<Keyed & Record<K, number>>, field: K) =>
  rows.map((row) => ({ _id: row._id, value: row[field] }));

/** The middle value, 0 for none — one ticket left open for a month must not move the typical wait. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values];
  sorted.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
