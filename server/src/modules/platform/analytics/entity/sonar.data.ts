import { measureMap, sonarGet, type SonarConfig, type SonarMeasure } from '@utils/sonarqube';
import { bucketOfDay, dayKeyIn, type AnalyticsWindow } from './window';

/**
 * What the Security and Unit Test Coverage pages read from SonarQube. Every
 * figure is the LAST analysis CI published, so "now" is the latest scan, and a
 * trend is the value each scan left standing.
 */

export interface HistoryPoint {
  at: Date;
  value: number;
}

interface ComponentResponse {
  component: { measures: SonarMeasure[] };
}

interface HistoryResponse {
  measures: Array<{ metric: string; history: Array<{ date: string; value?: string }> }>;
}

interface GateResponse {
  projectStatus: { status: string; conditions?: Array<{ status: string }> };
}

interface IssuesResponse {
  facets: Array<{ property: string; values: Array<{ val: string; count: number }> }>;
}

/** Sonar writes offsets as `+0000`; the ISO form every parser agrees on is `+00:00`. */
const isoDate = (date: string) => new Date(date.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));

/** The project's current value of each metric. */
export async function projectMeasures(cfg: SonarConfig, metrics: readonly string[]): Promise<Map<string, number>> {
  const res = await sonarGet<ComponentResponse>(cfg, '/api/measures/component', {
    component: cfg.projectKey,
    metricKeys: metrics.join(','),
  });
  return measureMap(res.component.measures);
}

/**
 * Every analysis' value of each metric, oldest first. Housekeeping thins old
 * analyses to one a week and then one a month, so a year is a few hundred points.
 */
export async function measureHistory(
  cfg: SonarConfig,
  metrics: readonly string[]
): Promise<Map<string, HistoryPoint[]>> {
  const res = await sonarGet<HistoryResponse>(cfg, '/api/measures/search_history', {
    component: cfg.projectKey,
    metrics: metrics.join(','),
    ps: 1000,
  });
  return new Map(
    res.measures.map((measure) => [
      measure.metric,
      measure.history.flatMap((point) =>
        point.value === undefined ? [] : [{ at: isoDate(point.date), value: Number(point.value) }]
      ),
    ])
  );
}

/** How many quality-gate conditions the last analysis failed. */
export async function failingGateConditions(cfg: SonarConfig): Promise<number> {
  const { projectStatus } = await sonarGet<GateResponse>(cfg, '/api/qualitygates/project_status', {
    projectKey: cfg.projectKey,
  });
  return (projectStatus.conditions ?? []).filter((condition) => condition.status === 'ERROR').length;
}

/** Open issues counted by each facet asked for — `ps: 1` because only the counts are read. */
export async function openIssueFacets(
  cfg: SonarConfig,
  facets: readonly string[]
): Promise<Map<string, Map<string, number>>> {
  const res = await sonarGet<IssuesResponse>(cfg, '/api/issues/search', {
    componentKeys: cfg.projectKey,
    issueStatuses: 'OPEN,CONFIRMED',
    facets: facets.join(','),
    ps: 1,
  });
  return new Map(
    res.facets.map((facet) => [facet.property, new Map(facet.values.map((value) => [value.val, value.count]))])
  );
}

/** The value standing at an instant: the last analysis before it, or null before the first. */
export function valueAt(points: readonly HistoryPoint[] | undefined, at: Date): number | null {
  let value: number | null = null;
  for (const point of points ?? []) {
    if (point.at >= at) break;
    value = point.value;
  }
  return value;
}

/**
 * One value per bucket: the last analysis inside it, or the value still
 * standing from before — a day without a scan did not reset the count.
 */
export function standingSeries(points: readonly HistoryPoint[] | undefined, window: AnalyticsWindow): number[] {
  const lastInBucket = new Map<string, number>();
  for (const point of points ?? []) {
    if (point.at < window.from || point.at > window.to) continue;
    lastInBucket.set(bucketOfDay(dayKeyIn(point.at, window.zone), window.granularity), point.value);
  }
  let standing = valueAt(points, window.from) ?? 0;
  return window.buckets.map((bucket) => {
    standing = lastInBucket.get(bucket) ?? standing;
    return standing;
  });
}
