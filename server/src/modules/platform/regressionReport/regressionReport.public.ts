import type {
  IRegressionCoverageDelta,
  IRegressionItem,
  IRegressionReport,
  IRegressionSuiteDelta,
} from './regressionReport.model';

/** after − before, to two decimals; null unless both sides were measured. */
export function deltaOf(before: number | null | undefined, after: number | null | undefined): number | null {
  if (before == null || after == null) return null;
  return Math.round((after - before) * 100) / 100;
}

const pubCoverageDelta = (d: IRegressionCoverageDelta | null | undefined) =>
  d
    ? {
        workspace: d.workspace,
        lines_before: d.lines_before,
        lines_after: d.lines_after,
        lines_delta: deltaOf(d.lines_before, d.lines_after),
        branches_before: d.branches_before,
        branches_after: d.branches_after,
        branches_delta: deltaOf(d.branches_before, d.branches_after),
        functions_before: d.functions_before,
        functions_after: d.functions_after,
        functions_delta: deltaOf(d.functions_before, d.functions_after),
        statements_before: d.statements_before,
        statements_after: d.statements_after,
        statements_delta: deltaOf(d.statements_before, d.statements_after),
      }
    : null;

const delta = (before: number | null, after: number | null): number | null =>
  before == null && after == null ? null : (after ?? 0) - (before ?? 0);

const pubSuite = (s: IRegressionSuiteDelta) => ({
  suite: s.suite,
  status_before: s.status_before,
  status_after: s.status_after,
  changed: s.status_before !== s.status_after,
  passed_before: s.passed_before,
  passed_after: s.passed_after,
  passed_delta: delta(s.passed_before, s.passed_after),
  failed_before: s.failed_before,
  failed_after: s.failed_after,
  failed_delta: delta(s.failed_before, s.failed_after),
  tests_before: s.tests_before,
  tests_after: s.tests_after,
});

export const pubReport = (doc: IRegressionReport) => ({
  id: String(doc._id),
  kind: doc.kind,
  status: doc.status,
  run_id: String(doc.run_id),
  run_no: doc.run_no,
  base_run_id: doc.base_run_id ? String(doc.base_run_id) : null,
  base_run_no: doc.base_run_no,
  branch: doc.branch,
  workflow: doc.workflow,
  counts: {
    regressed: doc.counts?.regressed ?? 0,
    fixed: doc.counts?.fixed ?? 0,
    still_failing: doc.counts?.still_failing ?? 0,
    new_failing: doc.counts?.new_failing ?? 0,
    new_tests: doc.counts?.new_tests ?? 0,
    removed_tests: doc.counts?.removed_tests ?? 0,
  },
  items_kept: doc.items_kept,
  truncated: doc.truncated,
  items_purged: doc.items_purged,
  skipped_workspaces: doc.skipped_workspaces ?? [],
  coverage_total: pubCoverageDelta(doc.coverage_total),
  coverage_workspaces: (doc.coverage_workspaces ?? []).map((d) => pubCoverageDelta(d)),
  suites: (doc.suites ?? []).map(pubSuite),
  created_at: doc.created_at.toISOString(),
});

export const pubItem = (doc: IRegressionItem) => ({
  id: String(doc._id),
  bucket: doc.bucket,
  workspace: doc.workspace,
  file: doc.file,
  full_name: doc.full_name,
  title: doc.title,
  failure_message: doc.failure_message,
});
