import { bucketSeries, type AnalyticsWindow } from './window';
import {
  durationsOf,
  e2eFigures,
  loadE2eRuns,
  suiteLeaderboard,
  suiteTotals,
  totalOf,
  type E2eRow,
} from './e2e.data';
import {
  average,
  breakdown,
  fixedSlices,
  kpi,
  rankedSlices,
  tally,
  topSlices,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsKpi,
  type EntityAnalyticsSections,
} from './shapes';

/**
 * Analytics > Testing > E2E Tests — the Cypress sweeps Tech > E2E Tests
 * records: how often they go green, how many scenarios they cover, how long
 * they take and which suites fail most. Runs are counted by when they started.
 */

const STATUS_KEYS = ['SUCCESS', 'FAILED', 'RUNNING', 'QUEUED'] as const;
const TRIGGER_KEYS = ['SCHEDULE', 'PORTAL', 'MANUAL'] as const;

function e2eKpis(current: readonly E2eRow[], previous: readonly E2eRow[]): AnalyticsKpi[] {
  const now = e2eFigures(current);
  const before = e2eFigures(previous);
  const lower = { higherIsBetter: false } as const;
  return [
    kpi('e2e_runs', now.runs, before.runs),
    kpi('e2e_run_pass_rate', now.run_pass_rate, before.run_pass_rate, { format: 'PERCENT' }),
    kpi('e2e_tests', now.tests, before.tests),
    kpi('e2e_test_pass_rate', now.test_pass_rate, before.test_pass_rate, { format: 'PERCENT' }),
    kpi('e2e_failed_tests', now.failed_tests, before.failed_tests, lower),
    kpi('e2e_skipped_tests', now.skipped_tests, before.skipped_tests, lower),
    kpi('e2e_avg_duration', now.avg_duration, before.avg_duration, { format: 'DURATION', higherIsBetter: false }),
    kpi('e2e_suites_failed', now.suites_failed, before.suites_failed, lower),
  ];
}

function e2eBreakdowns(rows: readonly E2eRow[], failures: ReadonlyMap<string, number>): AnalyticsBreakdown[] {
  const branches = tally(rows.map((row) => row.ref || 'none'));
  const branchNames = new Map([...branches.keys()].filter((ref) => ref !== 'none').map((ref) => [ref, ref]));
  return [
    breakdown('e2e_status', fixedSlices(STATUS_KEYS, tally(rows.map((row) => row.status))), { ordered: true }),
    breakdown('e2e_trigger', fixedSlices(TRIGGER_KEYS, tally(rows.map((row) => row.trigger_source))), { ordered: true }),
    breakdown('e2e_branch', topSlices(branches, branchNames)),
    breakdown('e2e_suite_failures', rankedSlices(failures, ([suite]) => suite, ([, count]) => count)),
  ];
}

export async function e2eAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [current, previous] = await Promise.all([
    loadE2eRuns(window.from, window.to),
    loadE2eRuns(window.prevFrom, window.from),
  ]);
  const suites = suiteTotals(current);
  const failures = new Map([...suites.entries()].map(([key, sums]) => [key, sums.failedRuns]));
  const startedAt = (row: E2eRow) => row.created_at;
  const per = (reduce: (runs: E2eRow[]) => number) => bucketSeries(current, startedAt, window, reduce);
  const runsWith = (status: string) => per((runs) => runs.filter((run) => run.status === status).length);

  return {
    kpis: e2eKpis(current, previous),
    trends: [
      trend('e2e_runs', window, [
        { key: 'e2e_runs_passed', values: runsWith('SUCCESS') },
        { key: 'e2e_runs_failed', values: runsWith('FAILED') },
      ]),
      trend('e2e_test_results', window, [
        { key: 'e2e_tests_passed', values: per((runs) => totalOf(runs, 'passed')) },
        { key: 'e2e_failed_tests', values: per((runs) => totalOf(runs, 'failed')) },
        { key: 'e2e_skipped_tests', values: per((runs) => totalOf(runs, 'skipped')) },
      ]),
      trend(
        'e2e_duration',
        window,
        [{ key: 'e2e_avg_duration', values: per((runs) => average(durationsOf(runs))) }],
        'DURATION'
      ),
    ],
    breakdowns: e2eBreakdowns(current, failures),
    leaderboard: suiteLeaderboard(suites),
  };
}
