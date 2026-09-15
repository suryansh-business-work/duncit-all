import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { getAppTimeZone } from '@utils/app-time';
import { StatusCheckModel } from '@observability/statusHistory.model';
import { SERVER_HISTORY_DAYS, ServerMetricSampleModel } from './tech.history.model';

/**
 * The month of server history, one row per calendar day in the admin's time
 * zone (Admin > Settings), so "14 Sep" on the chart is the day an operator
 * lived through rather than a UTC one.
 *
 * Everything is folded in Mongo — the page never pulls the ~8.6k raw samples.
 * A day with no samples stays in the list with null readings, so the charts
 * draw a gap for the days the API was down or not yet recording instead of a
 * line across them.
 */

/** The API's own status-page probe — the latency a caller outside the box sees. */
const API_PROBE_KEY = 'server';
/** Containers the per-day memory breakdown keeps — the heaviest, which are the ones worth reading. */
const MAX_CONTAINERS = 8;

const round1 = (n: number) => Math.round(n * 10) / 10;
const maybe = (n: number | null | undefined) => (n == null ? null : round1(n));

interface HostDayRow {
  _id: string;
  samples: number;
  cpu_avg: number;
  cpu_peak: number;
  load_avg: number;
  memory_avg: number;
  memory_peak: number;
  swap_peak: number;
  disk_pct: number;
  disk_used: number;
  disk_total: number;
  requests: number;
  errors: number;
  latency_weighted: number;
  p95_weighted: number;
  latency_peak: number;
  loop_peak: number;
  rss_peak: number;
}

interface ProbeDayRow {
  _id: string;
  latency: number | null;
  ok: number;
  total: number;
}

interface ContainerDayRow {
  _id: { name: string; day: string };
  cpu_sum: number;
  cpu_peak: number;
  memory_sum: number;
  memory_peak: number;
  samples: number;
}

/** The last `days` calendar days in `zone`, oldest first, as yyyy-MM-dd. */
function dayKeys(days: number, zone: string): string[] {
  const [y, m, d] = formatInTimeZone(new Date(), zone, 'yyyy-MM-dd').split('-').map(Number);
  return Array.from({ length: days }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - (days - 1 - i))).toISOString().slice(0, 10)
  );
}

const dayOf = (zone: string) => ({ $dateToString: { format: '%Y-%m-%d', date: '$at', timezone: zone } });

function hostDays(from: Date, zone: string) {
  return ServerMetricSampleModel.aggregate<HostDayRow>([
    { $match: { at: { $gte: from } } },
    { $sort: { at: 1 } },
    {
      $group: {
        _id: dayOf(zone),
        samples: { $sum: 1 },
        cpu_avg: { $avg: '$cpu_avg_pct' },
        cpu_peak: { $max: '$cpu_peak_pct' },
        load_avg: { $avg: '$load_avg_5' },
        memory_avg: { $avg: '$memory_pct' },
        memory_peak: { $max: '$memory_pct' },
        swap_peak: { $max: '$swap_pct' },
        disk_pct: { $last: '$disk_pct' },
        disk_used: { $last: '$disk_used_bytes' },
        disk_total: { $last: '$disk_total_bytes' },
        requests: { $sum: '$requests' },
        errors: { $sum: '$errors_5xx' },
        latency_weighted: { $sum: { $multiply: ['$latency_avg_ms', '$requests'] } },
        p95_weighted: { $sum: { $multiply: ['$latency_p95_ms', '$requests'] } },
        latency_peak: { $max: '$latency_p95_ms' },
        loop_peak: { $max: '$event_loop_p99_ms' },
        rss_peak: { $max: '$rss_mb' },
      },
    },
  ]);
}

function probeDays(from: Date, zone: string) {
  return StatusCheckModel.aggregate<ProbeDayRow>([
    { $match: { service_key: API_PROBE_KEY, checked_at: { $gte: from } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$checked_at', timezone: zone } },
        latency: { $avg: '$latency_ms' },
        ok: { $sum: { $cond: ['$ok', 1, 0] } },
        total: { $sum: 1 },
      },
    },
  ]);
}

function containerDays(from: Date, zone: string) {
  return ServerMetricSampleModel.aggregate<ContainerDayRow>([
    { $match: { at: { $gte: from } } },
    { $unwind: '$containers' },
    {
      $group: {
        _id: { name: '$containers.name', day: dayOf(zone) },
        cpu_sum: { $sum: '$containers.cpu_pct' },
        cpu_peak: { $max: '$containers.cpu_pct' },
        memory_sum: { $sum: '$containers.memory_mb' },
        memory_peak: { $max: '$containers.memory_mb' },
        samples: { $sum: 1 },
      },
    },
  ]);
}

function toDay(date: string, host: HostDayRow | undefined, probe: ProbeDayRow | undefined) {
  const weighted = (sum: number | undefined) => (host && host.requests > 0 ? round1((sum ?? 0) / host.requests) : null);
  return {
    date,
    samples: host?.samples ?? 0,
    cpuAvgPct: maybe(host?.cpu_avg),
    cpuPeakPct: maybe(host?.cpu_peak),
    loadAvg: maybe(host?.load_avg),
    memoryAvgPct: maybe(host?.memory_avg),
    memoryPeakPct: maybe(host?.memory_peak),
    swapPeakPct: maybe(host?.swap_peak),
    diskPct: maybe(host?.disk_pct),
    diskUsedBytes: host?.disk_used ?? null,
    diskTotalBytes: host?.disk_total ?? null,
    requests: host?.requests ?? null,
    errors5xx: host?.errors ?? null,
    latencyAvgMs: weighted(host?.latency_weighted),
    latencyP95Ms: weighted(host?.p95_weighted),
    latencyPeakMs: maybe(host?.latency_peak),
    eventLoopP99PeakMs: maybe(host?.loop_peak),
    rssPeakMb: maybe(host?.rss_peak),
    probeLatencyMs: maybe(probe?.latency),
    uptimePct: probe && probe.total > 0 ? round1((100 * probe.ok) / probe.total) : null,
  };
}

export type ServerHistoryDay = ReturnType<typeof toDay>;

/** Heaviest containers by peak memory, with their per-day peak aligned to `keys`. */
function toContainers(rows: ContainerDayRow[], keys: string[]) {
  const byName = new Map<string, ContainerDayRow[]>();
  for (const row of rows) byName.set(row._id.name, [...(byName.get(row._id.name) ?? []), row]);
  const containers = [...byName.entries()].map(([name, days]) => {
    const samples = days.reduce((acc, d) => acc + d.samples, 0);
    const peakByDay = new Map(days.map((d) => [d._id.day, d.memory_peak]));
    return {
      name,
      cpuAvgPct: round1(days.reduce((acc, d) => acc + d.cpu_sum, 0) / samples),
      cpuPeakPct: round1(Math.max(...days.map((d) => d.cpu_peak))),
      memoryAvgMb: Math.round(days.reduce((acc, d) => acc + d.memory_sum, 0) / samples),
      memoryPeakMb: Math.round(Math.max(...days.map((d) => d.memory_peak))),
      dailyMemoryPeakMb: keys.map((key) => peakByDay.get(key) ?? null),
    };
  });
  containers.sort((a, b) => b.memoryPeakMb - a.memoryPeakMb);
  return containers.slice(0, MAX_CONTAINERS);
}

/** Least-squares slope of disk used per day, over the days that have a reading. */
function diskGrowthPerDay(days: ServerHistoryDay[]): number | null {
  const points = days
    .map((day, x) => ({ x, y: day.diskUsedBytes }))
    .filter((p): p is { x: number; y: number } => p.y != null);
  if (points.length < 2) return null;
  const n = points.length;
  const meanX = points.reduce((acc, p) => acc + p.x, 0) / n;
  const meanY = points.reduce((acc, p) => acc + p.y, 0) / n;
  const num = points.reduce((acc, p) => acc + (p.x - meanX) * (p.y - meanY), 0);
  const den = points.reduce((acc, p) => acc + (p.x - meanX) ** 2, 0);
  return den > 0 ? Math.round(num / den) : null;
}

const avgOf = (values: Array<number | null>) => {
  const present = values.filter((v): v is number => v != null);
  return present.length > 0 ? round1(present.reduce((acc, v) => acc + v, 0) / present.length) : null;
};
const maxOf = (values: Array<number | null>) => {
  const present = values.filter((v): v is number => v != null);
  return present.length > 0 ? Math.max(...present) : null;
};

function summarize(days: ServerHistoryDay[]) {
  const recorded = days.filter((d) => d.samples > 0);
  const latest = recorded.at(-1);
  const growth = diskGrowthPerDay(days);
  const freeBytes = latest?.diskTotalBytes != null && latest.diskUsedBytes != null ? latest.diskTotalBytes - latest.diskUsedBytes : null;
  const untilFull = growth != null && growth > 0 && freeBytes != null ? Math.floor(freeBytes / growth) : null;
  return {
    daysWithData: recorded.length,
    cpuAvgPct: avgOf(days.map((d) => d.cpuAvgPct)),
    cpuPeakPct: maxOf(days.map((d) => d.cpuPeakPct)),
    memoryAvgPct: avgOf(days.map((d) => d.memoryAvgPct)),
    memoryPeakPct: maxOf(days.map((d) => d.memoryPeakPct)),
    diskPct: latest?.diskPct ?? null,
    diskGrowthBytesPerDay: growth,
    daysUntilDiskFull: untilFull,
    latencyP95Ms: avgOf(days.map((d) => d.latencyP95Ms)),
    probeLatencyMs: avgOf(days.map((d) => d.probeLatencyMs)),
    uptimePct: avgOf(days.map((d) => d.uptimePct)),
    requests: days.reduce((acc, d) => acc + (d.requests ?? 0), 0),
    errors5xx: days.reduce((acc, d) => acc + (d.errors5xx ?? 0), 0),
  };
}

/** The last month, per day — what the charts draw and what the recommendation reads. */
export async function serverHistory(days = SERVER_HISTORY_DAYS) {
  const span = Math.min(Math.max(1, Math.trunc(days) || SERVER_HISTORY_DAYS), SERVER_HISTORY_DAYS);
  const zone = getAppTimeZone();
  const keys = dayKeys(span, zone);
  // Midnight of the first day, in the admin's zone.
  const from = fromZonedTime(`${keys[0]}T00:00:00`, zone);
  const [host, probes, containers] = await Promise.all([
    hostDays(from, zone),
    probeDays(from, zone),
    containerDays(from, zone),
  ]);
  const hostByDay = new Map(host.map((row) => [row._id, row]));
  const probeByDay = new Map(probes.map((row) => [row._id, row]));
  const rows = keys.map((key) => toDay(key, hostByDay.get(key), probeByDay.get(key)));
  return {
    timeZone: zone,
    days: rows,
    containers: toContainers(containers, keys),
    summary: summarize(rows),
  };
}
