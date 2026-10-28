import { unitTestRunService } from '@modules/platform/unitTestRun/unitTestRun.service';
import { regressionReportService } from '@modules/platform/regressionReport/regressionReport.service';
import { manualTestService } from '@modules/platform/manualTest/manualTest.service';
import { pct } from './testsOverview.score';

/** How many finished unit runs the coverage trend covers. */
const TREND_RUNS = 20;

type CoverageMetric = { covered: number; total: number; pct: number | null };
type Coverage = Record<'lines' | 'statements' | 'functions' | 'branches', CoverageMetric> | null;

const EMPTY_METRIC: CoverageMetric = { covered: 0, total: 0, pct: null };
const coverageOrEmpty = (c: Coverage) =>
  c ?? { lines: EMPTY_METRIC, statements: EMPTY_METRIC, functions: EMPTY_METRIC, branches: EMPTY_METRIC };

/** The latest finished unit run, its pass rate and line coverage, and the coverage trend behind it. */
export async function readUnit() {
  const [latest, trend] = await Promise.all([
    unitTestRunService.latestSummary(),
    unitTestRunService.coverageTrend(TREND_RUNS),
  ]);
  const points = trend.map((run) => ({
    run_id: run.id,
    finished_at: run.finished_at,
    lines: run.coverage?.lines.pct ?? null,
    branches: run.coverage?.branches.pct ?? null,
  }));
  if (!latest) return { summary: null, trend: points, passRate: null, coverage: null };

  const { totals } = latest;
  return {
    summary: {
      run_id: latest.id,
      status: latest.status,
      branch: latest.branch,
      finished_at: latest.finished_at,
      tests: totals.tests,
      passed: totals.passed,
      failed: totals.failed,
      skipped: totals.skipped,
      duration_ms: totals.duration_ms,
      coverage: coverageOrEmpty(latest.coverage),
      workspaces: latest.workspaces.map((ws) => ({
        workspace: ws.name,
        lines: ws.lines_pct,
        branches: ws.coverage?.branches.pct ?? null,
      })),
    },
    trend: points,
    passRate: pct(totals.passed, totals.passed + totals.failed),
    coverage: latest.coverage?.lines.pct ?? null,
  };
}

/**
 * The latest report of each kind, and how many tests regressed across them —
 * the REGRESSION_FREE signal reads the total, so a regressed E2E suite counts
 * as much as a regressed unit test.
 */
export async function readRegressions() {
  const latest = await regressionReportService.latestSummary();
  const reports = latest.map((r) => ({
    report_id: r.id,
    kind: r.kind,
    status: r.status,
    regressed: r.counts?.regressed ?? 0,
    fixed: r.counts?.fixed ?? 0,
    new_failing: r.counts?.new_failing ?? 0,
    created_at: r.created_at,
  }));
  const regressed = reports.length === 0 ? null : reports.reduce((sum, r) => sum + r.regressed, 0);
  return { reports, regressed };
}

/** The manual board at a glance; its pass rate is 0..1 on the service, 0-100 here. */
export async function readManual() {
  const stats = await manualTestService.boardStats();
  if (stats.total === 0) return { summary: null, passRate: null };
  const passRate = stats.pass_rate === null ? null : Math.round(stats.pass_rate * 1000) / 10;
  return {
    summary: {
      total: stats.total,
      open_bugs: stats.open_bugs,
      pass_rate: passRate,
      executed_last_7_days: stats.executed_last_7_days,
      by_category: stats.by_category,
      by_priority: stats.by_priority,
    },
    passRate,
  };
}
