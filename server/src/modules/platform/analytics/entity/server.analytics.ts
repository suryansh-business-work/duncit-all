import { STATUS_REPORT_IMPACTS, STATUS_REPORT_STATUSES } from '@modules/platform/statusReport/statusReport.model';
import { listStatusServices } from '@observability/statusServices';
import { consoleLink } from './links';
import { seriesFromDays, type AnalyticsWindow } from './window';
import {
  breakdown,
  countMap,
  fixedSlices,
  kpi,
  linkEverything,
  pct,
  rankedSlices,
  round1,
  topSlices,
  total,
  trend,
  type AnalyticsFormat,
  type AnalyticsKpi,
  type AnalyticsLeaderboard,
  type EntityAnalyticsSections,
} from './shapes';
import {
  API_PROBE_KEY,
  errorSources,
  heaviestContainers,
  hostDays,
  hostFigures,
  hostSeries,
  logDays,
  probeTotals,
  reportTotals,
  type ContainerRow,
  type HostDay,
  type HostFigures,
  type LogDay,
  type ProbeRow,
} from './server.data';

/**
 * Analytics > Tech > Server — how the host and the API held up over the
 * period: CPU, memory, disk, event-loop delay, API latency and 5xx answers from
 * the five-minute samples; uptime and failed probes from the status page; the
 * warn and error logs the platform wrote; and the problems people reported.
 * Host samples are kept 31 days, so a longer window reads what is still stored.
 */

const INFO = consoleLink('tech', '/server/info');
const DOCKER = consoleLink('tech', '/server/docker');
const LOGS = consoleLink('tech', '/telemetry/logs');
const ERROR_LOGS = consoleLink('tech', '/telemetry/error-logs');
const TELEMETRY = consoleLink('tech', '/telemetry/dashboard');
const REPORTS = consoleLink('tech', '/status-reports');
/** Docker reports container memory in MiB; the console formats bytes. */
const MIB = 1024 * 1024;

interface ServerFigures {
  host: HostFigures;
  uptime: number;
  probeFailures: number;
  errorLogs: number;
  warnLogs: number;
  reports: number;
}

interface ServerData {
  days: HostDay[];
  probes: ProbeRow[];
  logs: LogDay[];
  reportPeriods: Map<string, number>;
}

const inPeriod = (period: string) => (row: { _id: { period: string } }) => row._id.period === period;

const logsOf = (logs: readonly LogDay[], period: string, level: string) =>
  logs.filter((row) => row._id.period === period && row._id.level === level);

function figuresFor(data: ServerData, period: string): ServerFigures {
  const probes = data.probes.filter(inPeriod(period));
  const api = probes.find((row) => row._id.service === API_PROBE_KEY);
  const logCount = (level: string) => total(logsOf(data.logs, period, level).map((row) => row.count));
  return {
    host: hostFigures(data.days.filter(inPeriod(period))),
    uptime: pct(api?.ok ?? 0, api?.total ?? 0),
    probeFailures: total(probes.map((row) => row.total - row.ok)),
    errorLogs: logCount('error'),
    warnLogs: logCount('warn'),
    reports: data.reportPeriods.get(period) ?? 0,
  };
}

function serverKpis(now: ServerFigures, before: ServerFigures): AnalyticsKpi[] {
  const host = (key: string, value: (figures: HostFigures) => number, format: AnalyticsFormat) =>
    kpi(key, value(now.host), value(before.host), { format, higherIsBetter: false, link: INFO });
  const bad = (key: string, value: (figures: ServerFigures) => number, link = INFO) =>
    kpi(key, value(now), value(before), { higherIsBetter: false, link });
  return [
    host('srv_cpu_avg', (figures) => figures.cpu_avg, 'PERCENT'),
    host('srv_cpu_peak', (figures) => figures.cpu_peak, 'PERCENT'),
    host('srv_memory_avg', (figures) => figures.memory_avg, 'PERCENT'),
    host('srv_disk_used', (figures) => figures.disk_used, 'PERCENT'),
    host('srv_event_loop_p99', (figures) => figures.loop_p99, 'DURATION'),
    host('srv_api_p95', (figures) => figures.api_p95, 'DURATION'),
    host('srv_errors_5xx', (figures) => figures.errors, 'COUNT'),
    kpi('srv_uptime', now.uptime, before.uptime, { format: 'PERCENT', link: INFO }),
    bad('srv_probe_failures', (figures) => figures.probeFailures),
    bad('srv_error_logs', (figures) => figures.errorLogs, ERROR_LOGS),
    bad('srv_warn_logs', (figures) => figures.warnLogs, LOGS),
    bad('srv_status_reports', (figures) => figures.reports, REPORTS),
  ];
}

/** The containers with the highest memory peak in the window, as Tech > Server > Docker names them. */
function containerLeaderboard(rows: readonly ContainerRow[]): AnalyticsLeaderboard {
  return {
    key: 'srv_containers',
    columns: [
      { key: 'srv_container_cpu_avg', format: 'PERCENT' },
      { key: 'srv_container_cpu_peak', format: 'PERCENT' },
      { key: 'srv_container_memory_avg', format: 'BYTES' },
      { key: 'srv_container_memory_peak', format: 'BYTES' },
    ],
    rows: rows.map((row) => ({
      id: row._id,
      name: row._id,
      caption: null,
      values: [round1(row.cpu_avg), round1(row.cpu_peak), Math.round(row.memory_avg * MIB), Math.round(row.memory_peak * MIB)],
    })),
    link: DOCKER,
  };
}

/** Failed probes per monitored service in the window, named as the status page names them. */
function probeFailureSlices(probes: readonly ProbeRow[]) {
  const failures = new Map<string, number>();
  for (const row of probes.filter(inPeriod('now'))) {
    if (row.total > row.ok) failures.set(row._id.service, row.total - row.ok);
  }
  return topSlices(failures, new Map(listStatusServices().map((service) => [service.key, service.name])));
}

export async function serverAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [days, probes, logs, reports, sources, containers] = await Promise.all([
    hostDays(window),
    probeTotals(window),
    logDays(window),
    reportTotals(window),
    errorSources(window),
    heaviestContainers(window),
  ]);
  const data: ServerData = { days, probes, logs, reportPeriods: countMap(reports.periods) };
  const host = hostSeries(days.filter(inPeriod('now')), window);
  const logged = (level: string) =>
    seriesFromDays(logsOf(logs, 'now', level).map((row) => ({ _id: row._id.day, value: row.count })), window);
  const reportSplit = { ordered: true, link: REPORTS };

  return linkEverything(
    {
      kpis: serverKpis(figuresFor(data, 'now'), figuresFor(data, 'before')),
      trends: [
        trend('srv_resources', window, [
          { key: 'srv_cpu_avg', values: host((figures) => figures.cpu_avg) },
          { key: 'srv_memory_avg', values: host((figures) => figures.memory_avg) },
          { key: 'srv_disk_used', values: host((figures) => figures.disk_used) },
        ], 'PERCENT', INFO),
        trend('srv_latency', window, [
          { key: 'srv_api_avg', values: host((figures) => figures.api_avg) },
          { key: 'srv_api_p95', values: host((figures) => figures.api_p95) },
          { key: 'srv_event_loop_p99', values: host((figures) => figures.loop_p99) },
        ], 'DURATION', INFO),
        trend('srv_errors', window, [
          { key: 'srv_errors_5xx', values: host((figures) => figures.errors) },
          { key: 'srv_error_logs', values: logged('error') },
          { key: 'srv_warn_logs', values: logged('warn') },
        ], 'COUNT', ERROR_LOGS),
      ],
      breakdowns: [
        breakdown('srv_error_sources', rankedSlices(sources, (row) => row._id, (row) => row.count), { link: TELEMETRY }),
        breakdown('srv_probe_failures_by_service', probeFailureSlices(probes), { link: INFO }),
        breakdown('srv_reports_by_impact', fixedSlices(STATUS_REPORT_IMPACTS, countMap(reports.impact)), reportSplit),
        breakdown('srv_reports_by_status', fixedSlices(STATUS_REPORT_STATUSES, countMap(reports.status)), reportSplit),
      ],
      leaderboard: containerLeaderboard(containers),
    },
    INFO
  );
}
