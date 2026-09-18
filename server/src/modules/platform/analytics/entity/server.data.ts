import { ServerMetricSampleModel } from '@modules/platform/tech/tech.history.model';
import { TelemetryLogModel } from '@modules/platform/telemetry/telemetry.model';
import { StatusReportModel } from '@modules/platform/statusReport/statusReport.model';
import { StatusCheckModel } from '@observability/statusHistory.model';
import { bucketOfDay, dayKeyExpr, inEitherPeriod, inRange, type AnalyticsWindow } from './window';
import { mean, peak, round1, total } from './shapes';

/**
 * What the Server analytics page reads: the five-minute host samples behind
 * Tech > Server > Info (kept 31 days), the status-page probes (kept 90 days),
 * the persisted warn and error logs (Tech > Telemetry) and the problems people
 * reported on status.duncit.com.
 *
 * Every read covers the window and the period before it in one aggregation,
 * split by a `period` of `now` or `before`, so both are measured identically.
 * Tech > Server > Info's own history is fixed to "the last 30 days", which is
 * why the samples are folded here rather than through it.
 */

/** The API's own status-page probe — the same one Tech > Server > Info reads uptime from. */
export const API_PROBE_KEY = 'server';

const periodOf = (field: string, from: Date) => ({ $cond: [{ $gte: [`$${field}`, from] }, 'now', 'before'] });

export interface HostDay {
  _id: { day: string; period: string };
  samples: number;
  cpu_sum: number;
  cpu_peak: number;
  memory_sum: number;
  loop_sum: number;
  disk_pct: number;
  requests: number;
  errors: number;
  latency_weighted: number;
  p95_weighted: number;
}

/** Host samples per calendar day and period, oldest day first. */
export const hostDays = (window: AnalyticsWindow) =>
  ServerMetricSampleModel.aggregate<HostDay>([
    { $match: inEitherPeriod('at', window) },
    { $sort: { at: 1 } },
    {
      $group: {
        _id: { day: dayKeyExpr('at', window.zone), period: periodOf('at', window.from) },
        samples: { $sum: 1 },
        cpu_sum: { $sum: '$cpu_avg_pct' },
        cpu_peak: { $max: '$cpu_peak_pct' },
        memory_sum: { $sum: '$memory_pct' },
        loop_sum: { $sum: '$event_loop_p99_ms' },
        disk_pct: { $last: '$disk_pct' },
        requests: { $sum: '$requests' },
        errors: { $sum: '$errors_5xx' },
        // Latency is weighted by the requests each sample carried, as the Info page does.
        latency_weighted: { $sum: { $multiply: ['$latency_avg_ms', '$requests'] } },
        p95_weighted: { $sum: { $multiply: ['$latency_p95_ms', '$requests'] } },
      },
    },
    { $sort: { '_id.day': 1 } },
  ]);

export type HostFigures = ReturnType<typeof hostFigures>;

/** One set of host numbers for any run of days — a period, or one chart bucket. */
export function hostFigures(days: readonly HostDay[]) {
  const sum = (value: (day: HostDay) => number) => total(days.map(value));
  const samples = sum((day) => day.samples);
  const requests = sum((day) => day.requests);
  return {
    cpu_avg: mean(sum((day) => day.cpu_sum), samples),
    cpu_peak: round1(peak(days.map((day) => day.cpu_peak))),
    memory_avg: mean(sum((day) => day.memory_sum), samples),
    // Disk only grows or is cleaned up, so the latest reading is the one that matters.
    disk_used: round1(days.at(-1)?.disk_pct ?? 0),
    loop_p99: mean(sum((day) => day.loop_sum), samples),
    api_avg: mean(sum((day) => day.latency_weighted), requests),
    api_p95: mean(sum((day) => day.p95_weighted), requests),
    errors: sum((day) => day.errors),
  };
}

/** A figure per chart bucket, from the window's days grouped into the window's buckets. */
export function hostSeries(days: readonly HostDay[], window: AnalyticsWindow) {
  const groups = new Map<string, HostDay[]>();
  for (const day of days) {
    const key = bucketOfDay(day._id.day, window.granularity);
    const group = groups.get(key) ?? [];
    group.push(day);
    groups.set(key, group);
  }
  const figures = window.buckets.map((key) => hostFigures(groups.get(key) ?? []));
  return (value: (figures: HostFigures) => number) => figures.map(value);
}

export interface ContainerRow {
  _id: string;
  cpu_avg: number;
  cpu_peak: number;
  memory_avg: number;
  memory_peak: number;
}

/** The ten containers with the highest memory peak in the window. */
export const heaviestContainers = (window: AnalyticsWindow) =>
  ServerMetricSampleModel.aggregate<ContainerRow>([
    { $match: { at: inRange(window.from, window.to) } },
    { $unwind: '$containers' },
    {
      $group: {
        _id: '$containers.name',
        cpu_avg: { $avg: '$containers.cpu_pct' },
        cpu_peak: { $max: '$containers.cpu_pct' },
        memory_avg: { $avg: '$containers.memory_mb' },
        memory_peak: { $max: '$containers.memory_mb' },
      },
    },
    { $sort: { memory_peak: -1, _id: 1 } },
    { $limit: 10 },
  ]);

export interface ProbeRow {
  _id: { service: string; period: string };
  ok: number;
  total: number;
}

/** Status-page probe results per monitored service and period. */
export const probeTotals = (window: AnalyticsWindow) =>
  StatusCheckModel.aggregate<ProbeRow>([
    { $match: inEitherPeriod('checked_at', window) },
    {
      $group: {
        _id: { service: '$service_key', period: periodOf('checked_at', window.from) },
        ok: { $sum: { $cond: ['$ok', 1, 0] } },
        total: { $sum: 1 },
      },
    },
  ]);

export interface LogDay {
  _id: { day: string; level: string; period: string };
  count: number;
}

/** Persisted error and warn logs per day, level and period. */
export const logDays = (window: AnalyticsWindow) =>
  TelemetryLogModel.aggregate<LogDay>([
    { $match: { level: { $in: ['error', 'warn'] }, ...inEitherPeriod('created_at', window) } },
    {
      $group: {
        _id: {
          day: dayKeyExpr('created_at', window.zone),
          level: '$level',
          period: periodOf('created_at', window.from),
        },
        count: { $sum: 1 },
      },
    },
  ]);

/** The surfaces (`server`, `portal:crm`, `mobileApp:ios`…) that logged the most errors in the window. */
export const errorSources = (window: AnalyticsWindow) =>
  TelemetryLogModel.aggregate<{ _id: string; count: number }>([
    { $match: { level: 'error', created_at: inRange(window.from, window.to) } },
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 10 },
  ]);

type Counted = Array<{ _id: string; count: number }>;

/** Status reports filed: a count per period, and the window's by impact and by where they stand now. */
export async function reportTotals(window: AnalyticsWindow) {
  const inWindow = { $match: { created_at: { $gte: window.from } } };
  const [facets] = await StatusReportModel.aggregate<{ periods: Counted; impact: Counted; status: Counted }>([
    { $match: inEitherPeriod('created_at', window) },
    {
      $facet: {
        periods: [{ $group: { _id: periodOf('created_at', window.from), count: { $sum: 1 } } }],
        impact: [inWindow, { $group: { _id: '$impact', count: { $sum: 1 } } }],
        status: [inWindow, { $group: { _id: '$status', count: { $sum: 1 } } }],
      },
    },
  ]);
  return facets ?? { periods: [], impact: [], status: [] };
}
