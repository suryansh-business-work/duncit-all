import { formatInTimeZone } from 'date-fns-tz';

/**
 * The pure half of the AI Features dashboard: totals and per-area rollups of the
 * feature list, and a gap-free daily series. No database here, so the arithmetic
 * is unit-tested on its own.
 *
 * Totals are summed FROM the per-feature rows rather than aggregated a second
 * time, so the dashboard and the AI Features table can never disagree.
 */

const HALF_DAY_MS = 12 * 60 * 60 * 1000;

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** The fields of one AI feature row the dashboard adds up. */
export interface FeatureUsage {
  module: string;
  enabled: boolean;
  calls: number;
  failed_calls: number;
  skipped_calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  avg_duration_ms: number;
  unpriced_calls: number;
}

export interface FeatureArea {
  module: string;
  features: number;
  enabled: number;
  calls: number;
  failed_calls: number;
  total_tokens: number;
  cost_usd: number;
  avg_duration_ms: number;
}

export interface FeatureTotals {
  features_total: number;
  features_enabled: number;
  features_used: number;
  calls: number;
  failed_calls: number;
  skipped_calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  avg_duration_ms: number;
  unpriced_calls: number;
}

/**
 * A feature's average is over its own calls, so the overall average weighs each
 * feature by its call count. A plain mean of averages would let a feature called
 * once count as much as one called ten thousand times.
 */
const weightedAverage = (rows: readonly FeatureUsage[]): number => {
  const calls = rows.reduce((sum, row) => sum + row.calls, 0);
  if (calls === 0) return 0;
  const weighted = rows.reduce((sum, row) => sum + row.avg_duration_ms * row.calls, 0);
  return Math.round(weighted / calls);
};

const sum = (rows: readonly FeatureUsage[], pick: (row: FeatureUsage) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

export function featureTotals(rows: readonly FeatureUsage[]): FeatureTotals {
  return {
    features_total: rows.length,
    features_enabled: rows.filter((row) => row.enabled).length,
    features_used: rows.filter((row) => row.calls > 0).length,
    calls: sum(rows, (row) => row.calls),
    failed_calls: sum(rows, (row) => row.failed_calls),
    skipped_calls: sum(rows, (row) => row.skipped_calls),
    prompt_tokens: sum(rows, (row) => row.prompt_tokens),
    completion_tokens: sum(rows, (row) => row.completion_tokens),
    total_tokens: sum(rows, (row) => row.total_tokens),
    cost_usd: round6(sum(rows, (row) => row.cost_usd)),
    avg_duration_ms: weightedAverage(rows),
    unpriced_calls: sum(rows, (row) => row.unpriced_calls),
  };
}

/** One row per owning area, most expensive first, then busiest, then by name. */
export function featureAreas(rows: readonly FeatureUsage[]): FeatureArea[] {
  const byModule = new Map<string, FeatureUsage[]>();
  for (const row of rows) {
    const list = byModule.get(row.module) ?? [];
    list.push(row);
    byModule.set(row.module, list);
  }
  return Array.from(byModule, ([module, list]) => ({
    module,
    features: list.length,
    enabled: list.filter((row) => row.enabled).length,
    calls: sum(list, (row) => row.calls),
    failed_calls: sum(list, (row) => row.failed_calls),
    total_tokens: sum(list, (row) => row.total_tokens),
    cost_usd: round6(sum(list, (row) => row.cost_usd)),
    avg_duration_ms: weightedAverage(list),
  })).sort(
    (a, b) => b.cost_usd - a.cost_usd || b.calls - a.calls || a.module.localeCompare(b.module),
  );
}

/**
 * Every calendar day from `since` to `now` in the admin's time zone, oldest
 * first. Walking in half-day steps cannot skip a date even across a DST change,
 * and the duplicates it produces are dropped as they appear.
 */
export function dayKeys(since: Date, now: Date, zone: string): string[] {
  const keys: string[] = [];
  const push = (at: number) => {
    const key = formatInTimeZone(new Date(at), zone, 'yyyy-MM-dd');
    if (keys.at(-1) !== key) keys.push(key);
  };
  for (let at = since.getTime(); at < now.getTime(); at += HALF_DAY_MS) push(at);
  push(now.getTime());
  return keys;
}

export interface DayUsage {
  date: string;
  calls: number;
  failed_calls: number;
  skipped_calls: number;
  total_tokens: number;
  cost_usd: number;
  avg_duration_ms: number;
}

const emptyDay = (date: string): DayUsage => ({
  date,
  calls: 0,
  failed_calls: 0,
  skipped_calls: 0,
  total_tokens: 0,
  cost_usd: 0,
  avg_duration_ms: 0,
});

/**
 * A day with no calls is a zero, not a gap: a chart that skips it lies about the trend.
 * A series with more fields per day than `DayUsage` passes its own empty day.
 */
export function fillDays(keys: readonly string[], rows: readonly DayUsage[]): DayUsage[];
export function fillDays<T extends { date: string }>(
  keys: readonly string[],
  rows: readonly T[],
  empty: (date: string) => T,
): T[];
export function fillDays(
  keys: readonly string[],
  rows: readonly { date: string }[],
  empty: (date: string) => { date: string } = emptyDay,
): { date: string }[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  return keys.map((date) => byDate.get(date) ?? empty(date));
}
