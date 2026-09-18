import { consoleLink } from './links';
import { seriesFromDays, type AnalyticsWindow } from './window';
import {
  breakdown,
  kpi,
  linkEverything,
  pct,
  rankedSlices,
  topSlices,
  trend,
  type AnalyticsKpi,
  type AnalyticsLeaderboard,
  type EntityAnalyticsSections,
} from './shapes';
import {
  apiSeries,
  apiTotals,
  breachDays,
  countedOver,
  latencyBands,
  operationCount,
  operationStats,
  topBlockedCallers,
  type ApiSummary,
  type BreachDay,
  type OperationStats,
} from './apiPerformance.data';

/**
 * Analytics > Tech > API performance — how the GraphQL API answered over the
 * period: traffic, failures, latency percentiles, which operations were busiest
 * and slowest, who called, and what the rate limiter refused. Tech > GraphQL
 * Monitor and Tech > Rate Limiting hold the records behind every number.
 */

const OVERVIEW = consoleLink('tech', '/graphql-monitor/overview');
const OPERATIONS = consoleLink('tech', '/graphql-monitor/operations');
const ERRORS = consoleLink('tech', '/graphql-monitor/errors');
const BLOCKED = consoleLink('tech', '/rate-limiting/blocked');
const SYSTEMS = consoleLink('tech', '/rate-limiting/systems');
const TOP = 10;

interface ApiFigures {
  summary: ApiSummary;
  operations: number;
  blocks: number;
  breaches: number;
}

/** A period's breach events of one mode — ENFORCE refused the caller, MONITOR only recorded it. */
const breachesOf = (rows: readonly BreachDay[], period: string, mode: string) =>
  rows.filter((row) => row._id.period === period && row._id.mode === mode);

const countOf = (rows: readonly BreachDay[]) => rows.reduce((sum, row) => sum + row.count, 0);

function apiKpis(now: ApiFigures, before: ApiFigures): AnalyticsKpi[] {
  const latency = { format: 'DURATION', higherIsBetter: false, link: OVERVIEW } as const;
  const refused = { higherIsBetter: false, link: BLOCKED } as const;
  const cacheRate = (figures: ApiFigures) => pct(figures.summary.cached, figures.summary.requests);
  return [
    kpi('api_requests', now.summary.requests, before.summary.requests, { link: OVERVIEW }),
    kpi('api_failed_requests', now.summary.errors, before.summary.errors, { higherIsBetter: false, link: ERRORS }),
    kpi('api_error_rate', now.summary.error_rate_pct, before.summary.error_rate_pct, {
      format: 'PERCENT',
      higherIsBetter: false,
      link: ERRORS,
    }),
    kpi('api_p50', now.summary.p50_ms, before.summary.p50_ms, latency),
    kpi('api_p95', now.summary.p95_ms, before.summary.p95_ms, latency),
    kpi('api_p99', now.summary.p99_ms, before.summary.p99_ms, latency),
    kpi('api_cache_rate', cacheRate(now), cacheRate(before), { format: 'PERCENT', link: OVERVIEW }),
    kpi('api_operations', now.operations, before.operations, { link: OPERATIONS }),
    kpi('api_rate_limit_blocks', now.blocks, before.blocks, refused),
    kpi('api_monitored_breaches', now.breaches, before.breaches, refused),
  ];
}

/** The operations with the slowest p95 in the window, each linked to its own monitor page. */
function slowestOperations(operations: readonly OperationStats[]): AnalyticsLeaderboard {
  const ranked = [...operations].sort((a, b) => b.p95_ms - a.p95_ms || b.requests - a.requests).slice(0, TOP);
  return {
    key: 'api_slowest_operations',
    columns: [
      { key: 'api_requests', format: 'COUNT' },
      { key: 'api_error_rate', format: 'PERCENT' },
      { key: 'api_p50', format: 'DURATION' },
      { key: 'api_p95', format: 'DURATION' },
      { key: 'api_p99', format: 'DURATION' },
    ],
    rows: ranked.map((operation) => ({
      id: operation.id,
      name: operation.name,
      caption: operation.type,
      values: [operation.requests, operation.error_rate_pct, operation.p50_ms, operation.p95_ms, operation.p99_ms],
      link: consoleLink('tech', `/graphql-monitor/operations/${operation.id}`),
    })),
    link: OPERATIONS,
  };
}

export async function apiPerformanceAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [current, previous, operationsNow, operationsBefore, series, operations, breaches, codes, clients, callers] =
    await Promise.all([
      apiTotals(window.from, window.to, window.days),
      apiTotals(window.prevFrom, window.prevTo, window.days),
      operationCount(window.from, window.to),
      operationCount(window.prevFrom, window.prevTo),
      apiSeries(window),
      operationStats(window),
      breachDays(window),
      countedOver(window, 'error_codes'),
      countedOver(window, 'clients'),
      topBlockedCallers(window),
    ]);
  const figures = (summary: ApiSummary, operationTotal: number, period: string): ApiFigures => ({
    summary,
    operations: operationTotal,
    blocks: countOf(breachesOf(breaches, period, 'ENFORCE')),
    breaches: countOf(breachesOf(breaches, period, 'MONITOR')),
  });
  const perDay = (mode: string) =>
    seriesFromDays(
      breachesOf(breaches, 'now', mode).map((row) => ({ _id: row._id.day, value: row.count })),
      window
    );
  const labelOf = (row: { label: string }) => row.label;
  const countOfRow = (row: { count: number }) => row.count;

  return linkEverything(
    {
      kpis: apiKpis(figures(current.summary, operationsNow, 'now'), figures(previous.summary, operationsBefore, 'before')),
      trends: [
        trend(
          'api_traffic',
          window,
          [
            { key: 'api_requests', values: series.requests },
            { key: 'api_failed_requests', values: series.errors },
          ],
          'COUNT',
          OVERVIEW
        ),
        trend(
          'api_latency',
          window,
          [
            { key: 'api_p50', values: series.p50 },
            { key: 'api_p95', values: series.p95 },
            { key: 'api_p99', values: series.p99 },
          ],
          'DURATION',
          OVERVIEW
        ),
        trend(
          'api_rate_limiting',
          window,
          [
            { key: 'api_rate_limit_blocks', values: perDay('ENFORCE') },
            { key: 'api_monitored_breaches', values: perDay('MONITOR') },
          ],
          'COUNT',
          BLOCKED
        ),
      ],
      breakdowns: [
        breakdown(
          'api_busiest_operations',
          topSlices(
            new Map(operations.map((operation) => [operation.id, operation.requests])),
            new Map(operations.map((operation) => [operation.id, operation.name]))
          ),
          { link: OPERATIONS }
        ),
        breakdown('api_latency_bands', latencyBands(current.histogram), { ordered: true, link: OVERVIEW }),
        breakdown('api_errors_by_code', rankedSlices(codes, labelOf, countOfRow), { link: ERRORS }),
        breakdown('api_requests_by_client', rankedSlices(clients, labelOf, countOfRow), { link: SYSTEMS }),
        breakdown(
          'api_top_blocked_callers',
          rankedSlices(callers, (row) => row._id, countOfRow),
          { link: BLOCKED }
        ),
      ],
      leaderboard: slowestOperations(operations),
    },
    OVERVIEW
  );
}
