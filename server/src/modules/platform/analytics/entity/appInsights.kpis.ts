import { kpi, type AnalyticsFormat, type AnalyticsKpi } from './shapes';
import { hasIn, lastIn, meanIn, sumIn, type DayRange, type DayRow } from './appInsights.data';

/**
 * Tiles for App Insights, one rule per kind of number:
 * a count adds the period's days up and compares with the period before —
 * only when the history reaches back that far, since "up from nothing" would
 * be a claim about days nobody synced; a level reads the period's last day;
 * a daily average is averaged.
 */

export interface Days {
  current: DayRange;
  previous: DayRange;
}

interface TileOptions {
  format?: AnalyticsFormat;
  higherIsBetter?: boolean;
}

export const countTile = (key: string, rows: readonly DayRow[], metric: string, days: Days, options: TileOptions = {}) =>
  kpi(
    key,
    sumIn(rows, metric, days.current),
    hasIn(rows, metric, days.previous) ? sumIn(rows, metric, days.previous) : null,
    options
  );

export const levelTile = (key: string, rows: readonly DayRow[], metric: string, days: Days, options: TileOptions = {}) =>
  kpi(key, lastIn(rows, metric, days.current) ?? 0, lastIn(rows, metric, days.previous), options);

const round = (value: number | null) => (value === null ? null : Math.round(value * 100) / 100);

export const meanTile = (key: string, rows: readonly DayRow[], metric: string, days: Days, options: TileOptions = {}) =>
  kpi(key, round(meanIn(rows, metric, days.current)) ?? 0, round(meanIn(rows, metric, days.previous)), options);

/**
 * Two stores' counts added up. A store with no history at all (not connected)
 * is left out of the comparison; every store that has numbers must have them
 * for the earlier period too, or the tile is not compared.
 */
export function combinedTile(
  key: string,
  parts: ReadonlyArray<{ rows: readonly DayRow[]; metric: string }>,
  days: Days,
  options: TileOptions = {}
): AnalyticsKpi {
  const value = parts.reduce((sum, part) => sum + sumIn(part.rows, part.metric, days.current), 0);
  const present = parts.filter(
    (part) => hasIn(part.rows, part.metric, days.current) || hasIn(part.rows, part.metric, days.previous)
  );
  const comparable = present.length > 0 && present.every((part) => hasIn(part.rows, part.metric, days.previous));
  const previous = comparable ? parts.reduce((sum, part) => sum + sumIn(part.rows, part.metric, days.previous), 0) : null;
  return kpi(key, value, previous, options);
}
