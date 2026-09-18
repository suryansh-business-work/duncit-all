import type { Types } from 'mongoose';
import {
  E2eRunModel,
  type E2eRunStatus,
  type E2eRunTrigger,
  type IE2eRunTotals,
  type IE2eSuiteResult,
} from '@modules/platform/e2eRun/e2eRun.model';
import { inRange } from './window';
import { average, pct, total, type AnalyticsLeaderboard } from './shapes';

/** Every E2E run started in a period, with just what the E2E Tests analytics page reads. */

export interface E2eRow {
  _id: Types.ObjectId;
  status: E2eRunStatus;
  trigger_source: E2eRunTrigger;
  ref: string;
  results: Array<Pick<IE2eSuiteResult, 'key' | 'status' | 'tests' | 'failed' | 'duration_seconds'>>;
  totals: Partial<IE2eRunTotals> | null;
  duration_seconds: number | null;
  created_at: Date;
}

export const loadE2eRuns = (from: Date, to: Date) =>
  E2eRunModel.find({ created_at: inRange(from, to) })
    .select(
      'status trigger_source ref results.key results.status results.tests results.failed results.duration_seconds totals duration_seconds created_at'
    )
    .lean<E2eRow[]>();

export const isFinished = (row: E2eRow) => row.status === 'SUCCESS' || row.status === 'FAILED';

/** One of the run's summed counts, 0 for a run that has not reported it yet. */
export const totalOf = (rows: readonly E2eRow[], field: keyof IE2eRunTotals) =>
  total(rows.map((row) => row.totals?.[field] ?? 0));

/** How long the finished runs took, in milliseconds. */
export const durationsOf = (rows: readonly E2eRow[]) =>
  rows.flatMap((row) => (isFinished(row) && row.duration_seconds ? [row.duration_seconds * 1000] : []));

/** Each tile's value for one period — computed identically for both periods. */
export function e2eFigures(rows: readonly E2eRow[]) {
  const finished = rows.filter(isFinished);
  const tests = totalOf(rows, 'tests');
  return {
    runs: rows.length,
    run_pass_rate: pct(finished.filter((row) => row.status === 'SUCCESS').length, finished.length),
    tests,
    test_pass_rate: pct(totalOf(rows, 'passed'), tests),
    failed_tests: totalOf(rows, 'failed'),
    skipped_tests: totalOf(rows, 'skipped'),
    avg_duration: average(durationsOf(rows)),
    suites_failed: totalOf(rows, 'suites_failed'),
  };
}

interface SuiteTotals {
  runs: number;
  failedRuns: number;
  tests: number;
  failedTests: number;
  durations: number[];
}

/** Suites that ran (not skipped), with how often they went red. */
export function suiteTotals(rows: readonly E2eRow[]): Map<string, SuiteTotals> {
  const suites = new Map<string, SuiteTotals>();
  for (const result of rows.flatMap((row) => row.results ?? [])) {
    if (result.status !== 'PASSED' && result.status !== 'FAILED') continue;
    const sums = suites.get(result.key) ?? { runs: 0, failedRuns: 0, tests: 0, failedTests: 0, durations: [] };
    sums.runs += 1;
    if (result.status === 'FAILED') sums.failedRuns += 1;
    sums.tests += result.tests ?? 0;
    sums.failedTests += result.failed ?? 0;
    if (result.duration_seconds) sums.durations.push(result.duration_seconds * 1000);
    suites.set(result.key, sums);
  }
  return suites;
}

/** Every suite that ran, the least reliable first. */
export function suiteLeaderboard(suites: ReadonlyMap<string, SuiteTotals>): AnalyticsLeaderboard {
  const ranked = [...suites.entries()]
    .map(([key, sums]) => ({ key, sums, passRate: pct(sums.runs - sums.failedRuns, sums.runs) }))
    .sort((a, b) => b.sums.failedRuns - a.sums.failedRuns || a.passRate - b.passRate || b.sums.runs - a.sums.runs);
  return {
    key: 'e2e_suites',
    columns: [
      { key: 'runs', format: 'COUNT' },
      { key: 'pass_rate', format: 'PERCENT' },
      { key: 'tests', format: 'COUNT' },
      { key: 'failed_tests', format: 'COUNT' },
      { key: 'avg_duration', format: 'DURATION' },
    ],
    rows: ranked.map(({ key, sums, passRate }) => ({
      id: key,
      name: key,
      caption: null,
      values: [sums.runs, passRate, sums.tests, sums.failedTests, average(sums.durations)],
    })),
  };
}
