import { bucketSeries, type AnalyticsWindow } from './window';
import {
  endpointLeaderboard,
  latestSafeUsers,
  loadStressRuns,
  stressFigures,
  summariesOf,
  type StressRow,
} from './stress.data';
import {
  average,
  bandSlices,
  breakdown,
  fixedSlices,
  kpi,
  peak,
  tally,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsKpi,
  type Band,
  type EntityAnalyticsSections,
} from './shapes';

/**
 * Analytics > Testing > Stress Testing — the runs Tech > Stress Testing
 * started: how many finished, how hard they pushed, how the platform held up
 * and which endpoints slowed first. Runs are counted by when they started.
 */

const STATUS_KEYS = ['COMPLETED', 'ABORTED', 'FAILED', 'LIVE'] as const;
const VERDICT_KEYS = ['HEALTHY', 'STRAINED', 'OVERLOADED', 'INCONCLUSIVE', 'NONE'] as const;
const SCALE_BANDS: Band[] = [
  { key: 'scale_1_50', min: 0 },
  { key: 'scale_51_200', min: 51 },
  { key: 'scale_201_500', min: 201 },
  { key: 'scale_501_plus', min: 501 },
];

const OUTCOMES = new Set<string>(['COMPLETED', 'ABORTED', 'FAILED']);

/** Queued, running and stopping runs are one slice: none of them has an outcome yet. */
const statusKey = (row: StressRow) => (OUTCOMES.has(row.status) ? row.status : 'LIVE');

function stressKpis(current: readonly StressRow[], previous: readonly StressRow[]): AnalyticsKpi[] {
  const now = stressFigures(current);
  const before = stressFigures(previous);
  const kpis = [
    kpi('stress_runs', now.runs, before.runs),
    kpi('stress_completion_rate', now.completion, before.completion, { format: 'PERCENT' }),
    kpi('stress_peak_users', now.peak_users, before.peak_users),
    kpi('stress_peak_rps', now.peak_rps, before.peak_rps, { format: 'DECIMAL' }),
    kpi('stress_p95', now.p95, before.p95, { format: 'DURATION', higherIsBetter: false }),
    kpi('stress_error_rate', now.error_rate, before.error_rate, { format: 'PERCENT', higherIsBetter: false }),
    kpi('stress_requests', now.requests, before.requests),
  ];
  const safe = latestSafeUsers(current);
  if (safe !== null) kpis.push(kpi('stress_safe_users', safe, latestSafeUsers(previous)));
  return kpis;
}

function stressBreakdowns(rows: readonly StressRow[]): AnalyticsBreakdown[] {
  const verdicts = tally(rows.map((row) => row.verdict?.grade ?? 'NONE'));
  return [
    breakdown('stress_status', fixedSlices(STATUS_KEYS, tally(rows.map(statusKey))), { ordered: true }),
    breakdown('stress_verdict', fixedSlices(VERDICT_KEYS, verdicts), { ordered: true }),
    breakdown('stress_scale', bandSlices(rows.map((row) => row.profile?.virtual_users ?? 0), SCALE_BANDS), {
      ordered: true,
    }),
  ];
}

export async function stressAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [current, previous] = await Promise.all([
    loadStressRuns(window.from, window.to),
    loadStressRuns(window.prevFrom, window.prevTo),
  ]);
  const startedAt = (row: StressRow) => row.created_at;
  const count = (status: string) =>
    bucketSeries(current, startedAt, window, (runs) => runs.filter((run) => run.status === status).length);
  const summarised = current.filter((row) => row.summary);
  const latency = (field: 'p50_ms' | 'p95_ms' | 'p99_ms') =>
    bucketSeries(summarised, startedAt, window, (runs) => average(summariesOf(runs).map((summary) => summary[field])));
  const peakOf = (field: 'virtual_users' | 'rps') =>
    bucketSeries(current, startedAt, window, (runs) => peak(runs.map((run) => run.peaks?.[field] ?? 0)));

  return {
    kpis: stressKpis(current, previous),
    trends: [
      trend('stress_runs', window, [
        { key: 'stress_completed', values: count('COMPLETED') },
        { key: 'stress_aborted', values: count('ABORTED') },
        { key: 'stress_failed', values: count('FAILED') },
      ]),
      trend(
        'stress_latency',
        window,
        [
          { key: 'stress_p50', values: latency('p50_ms') },
          { key: 'stress_p95', values: latency('p95_ms') },
          { key: 'stress_p99', values: latency('p99_ms') },
        ],
        'DURATION'
      ),
      trend('stress_load', window, [
        { key: 'stress_peak_users', values: peakOf('virtual_users') },
        { key: 'stress_peak_rps', values: peakOf('rps') },
      ]),
    ],
    breakdowns: stressBreakdowns(current),
    leaderboard: endpointLeaderboard(current),
  };
}
