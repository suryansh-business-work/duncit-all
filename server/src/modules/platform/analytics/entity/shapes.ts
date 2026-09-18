import type { AnalyticsGranularity, AnalyticsWindow } from './window';
import type { ConsoleLink } from './links';

/**
 * The one payload every Analytics console page renders.
 *
 * It is deliberately generic — a list of tiles, trends, breakdowns and one
 * ranking — so the console draws every page with one set of components,
 * and a new data point is a server change plus one line of copy rather than a
 * new card. Every entry carries a `key` the console translates, and a `format`
 * saying what kind of number it is.
 */

export type AnalyticsEntity =
  | 'USERS'
  | 'PODS'
  | 'CLUBS'
  | 'CLUB_ADMINS'
  | 'HOSTS'
  | 'DATABASE'
  | 'ENV_KEYS'
  | 'SONARQUBE'
  | 'TEST_COVERAGE'
  | 'STRESS_TESTS'
  | 'E2E_TESTS'
  | 'REVENUE'
  | 'REWARDS'
  | 'SHOP'
  | 'VENUES'
  | 'MARKETING'
  | 'COMMUNICATIONS'
  | 'SUPPORT'
  | 'LEGAL'
  | 'AI_USAGE'
  | 'API_PERFORMANCE'
  | 'SERVER'
  | 'APP_RELEASES'
  | 'FUNNEL';
/**
 * BYTES is a size, DURATION is milliseconds, GRADE is SonarQube's 1-5 rating
 * (1 is A) — the console writes each in the reader's units.
 */
export type AnalyticsFormat =
  | 'COUNT'
  | 'PERCENT'
  | 'CURRENCY'
  | 'RATING'
  | 'DAYS'
  | 'DECIMAL'
  | 'BYTES'
  | 'DURATION'
  | 'GRADE';
/** WINDOW follows the chosen period; ALL_TIME is the state of things right now. */
export type AnalyticsScope = 'WINDOW' | 'ALL_TIME';

export interface AnalyticsKpi {
  key: string;
  value: number;
  /** The same number for the previous period; null for a live count. */
  previous: number | null;
  format: AnalyticsFormat;
  /** Whether a rise is good news — a rising cancellation rate is not. */
  higher_is_better: boolean;
  /** The console page with the records behind this number ("more details"). */
  link?: ConsoleLink | null;
}

export interface AnalyticsSeries {
  key: string;
  values: number[];
}

export interface AnalyticsTrend {
  key: string;
  format: AnalyticsFormat;
  granularity: AnalyticsGranularity;
  buckets: string[];
  series: AnalyticsSeries[];
  link?: ConsoleLink | null;
}

export interface AnalyticsSlice {
  key: string;
  /** A name read from the data (a city, a category); null when `key` is the label. */
  label: string | null;
  value: number;
}

export interface AnalyticsBreakdown {
  key: string;
  format: AnalyticsFormat;
  scope: AnalyticsScope;
  /** True when the slices have a natural order (hours, bands) that sorting would break. */
  ordered: boolean;
  slices: AnalyticsSlice[];
  link?: ConsoleLink | null;
}

export interface AnalyticsColumn {
  key: string;
  format: AnalyticsFormat;
}

export interface AnalyticsLeaderRow {
  id: string;
  name: string;
  caption: string | null;
  values: Array<number | null>;
  /** The row's own record page (a club, a host), when it has one. */
  link?: ConsoleLink | null;
}

export interface AnalyticsLeaderboard {
  key: string;
  columns: AnalyticsColumn[];
  rows: AnalyticsLeaderRow[];
  link?: ConsoleLink | null;
}

export interface EntityAnalyticsSections {
  kpis: AnalyticsKpi[];
  trends: AnalyticsTrend[];
  breakdowns: AnalyticsBreakdown[];
  leaderboard: AnalyticsLeaderboard | null;
  /** The console this whole page is about — the page header's "more details". */
  link?: ConsoleLink | null;
}

export const round1 = (value: number) => Math.round(value * 10) / 10;

/** `part` as a percentage of `whole`, one decimal; 0 when there is no whole. */
export const pct = (part: number, whole: number) => (whole > 0 ? round1((part / whole) * 100) : 0);

/** `total / count`, one decimal; 0 when nothing was counted. */
export const mean = (total: number, count: number) => (count > 0 ? round1(total / count) : 0);

/** The sum of a list of numbers. */
export const total = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0);

/** The mean of a list of numbers, one decimal; 0 for an empty list. */
export const average = (values: readonly number[]) => mean(total(values), values.length);

/** The largest of a list of numbers; 0 for an empty list. */
export const peak = (values: readonly number[]) => values.reduce((top, value) => Math.max(top, value), 0);

interface KpiOptions {
  format?: AnalyticsFormat;
  higherIsBetter?: boolean;
  link?: ConsoleLink | null;
}

export function kpi(
  key: string,
  value: number,
  previous: number | null,
  { format = 'COUNT', higherIsBetter = true, link = null }: KpiOptions = {}
): AnalyticsKpi {
  return { key, value, previous, format, higher_is_better: higherIsBetter, link };
}

export function trend(
  key: string,
  window: AnalyticsWindow,
  series: AnalyticsSeries[],
  format: AnalyticsFormat = 'COUNT',
  link: ConsoleLink | null = null
): AnalyticsTrend {
  return { key, format, granularity: window.granularity, buckets: window.buckets, series, link };
}

interface BreakdownOptions {
  format?: AnalyticsFormat;
  scope?: AnalyticsScope;
  ordered?: boolean;
  link?: ConsoleLink | null;
}

export function breakdown(
  key: string,
  slices: AnalyticsSlice[],
  { format = 'COUNT', scope = 'WINDOW', ordered = false, link = null }: BreakdownOptions = {}
): AnalyticsBreakdown {
  return { key, format, scope, ordered, slices, link };
}

/** Links widgets by their key — for a page whose links are a table of key → page. Own links win. */
export function linkWidgets(
  sections: EntityAnalyticsSections,
  linkOf: (key: string) => ConsoleLink | null
): EntityAnalyticsSections {
  const own = <T extends { key: string; link?: ConsoleLink | null }>(item: T): T => ({
    ...item,
    link: item.link ?? linkOf(item.key),
  });
  return {
    ...sections,
    kpis: sections.kpis.map(own),
    trends: sections.trends.map(own),
    breakdowns: sections.breakdowns.map(own),
    leaderboard: sections.leaderboard ? own(sections.leaderboard) : null,
  };
}

/**
 * Every widget on a page that has no link of its own points at `link` — the
 * one console page all of it comes from. A loader names its specific pages
 * where they exist and lets this fill the rest, so no number is ever a dead end.
 */
export function linkEverything(sections: EntityAnalyticsSections, link: ConsoleLink): EntityAnalyticsSections {
  const own = <T extends { link?: ConsoleLink | null }>(item: T): T => ({ ...item, link: item.link ?? link });
  return {
    ...sections,
    link: sections.link ?? link,
    kpis: sections.kpis.map(own),
    trends: sections.trends.map(own),
    breakdowns: sections.breakdowns.map(own),
    leaderboard: sections.leaderboard ? own(sections.leaderboard) : null,
  };
}

/** Slices in a fixed key order, zeroes kept — a status nobody is in still exists. */
export function fixedSlices(keys: readonly string[], counts: ReadonlyMap<string, number>): AnalyticsSlice[] {
  return keys.map((key) => ({ key, label: null, value: counts.get(key) ?? 0 }));
}

/** Named slices, largest first, capped — a long tail of ones is not a chart. */
export function topSlices(
  counts: ReadonlyMap<string, number>,
  names: ReadonlyMap<string, string>,
  limit = 10
): AnalyticsSlice[] {
  return [...counts.entries()]
    .map(([key, value]) => ({ key, label: names.get(key) ?? null, value }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/** Rows as slices each named by itself (a collection, a workspace, a rule), largest first, capped. */
export function rankedSlices<T>(
  rows: Iterable<T>,
  nameOf: (row: T) => string,
  valueOf: (row: T) => number,
  limit = 10
): AnalyticsSlice[] {
  return [...rows]
    .map((row) => ({ key: nameOf(row), label: nameOf(row), value: valueOf(row) }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export interface Band {
  key: string;
  /** Inclusive lower bound. */
  min: number;
}

/** The last band whose `min` the value reaches. Bands ascend. */
function bandOf(value: number, bands: readonly Band[]): Band | null {
  let match: Band | null = null;
  for (const band of bands) {
    if (value >= band.min) match = band;
  }
  return match;
}

/** Counts each value into its band. */
export function bandSlices(values: readonly number[], bands: readonly Band[]): AnalyticsSlice[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const band = bandOf(value, bands);
    if (band) counts.set(band.key, (counts.get(band.key) ?? 0) + 1);
  }
  return fixedSlices(
    bands.map((band) => band.key),
    counts
  );
}

/** Tallies string keys — the in-memory `$group` for rows already loaded. */
export function tally(keys: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

/** Counts each key once per distinct id — "admins per city", not "clubs per city". */
export function distinctTally(pairs: Iterable<{ id: string; key: string }>): Map<string, number> {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const { id, key } of pairs) {
    const pair = `${id}:${key}`;
    if (seen.has(pair)) continue;
    seen.add(pair);
    keys.push(key);
  }
  return tally(keys);
}

/** How many pods each club or person held, banded. */
export const PODS_BANDS: Band[] = [
  { key: 'pods_0', min: 0 },
  { key: 'pods_1', min: 1 },
  { key: 'pods_2_4', min: 2 },
  { key: 'pods_5_9', min: 5 },
  { key: 'pods_10_plus', min: 10 },
];

/** `{ _id, count }` aggregation rows as a Map keyed by the stringified id. */
export const countMap = (rows: ReadonlyArray<{ _id: string | number | null; count: number }>) =>
  new Map(rows.map((row) => [String(row._id), row.count]));

export const STAR_KEYS = ['1', '2', '3', '4', '5'] as const;
