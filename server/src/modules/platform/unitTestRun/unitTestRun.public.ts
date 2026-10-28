import type {
  IUnitCoverage,
  IUnitCoverageMetric,
  IUnitTestCase,
  IUnitTestCounts,
  IUnitTestFile,
  IUnitTestRun,
  IUnitTestWorkspace,
} from './unitTestRun.model';

/**
 * Documents → the shapes the schema declares. Percentages are computed here,
 * from covered/total, so the stored numbers stay summable and the client never
 * has to divide.
 */

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/** Two decimals, or null when nothing was measured — 0 of 0 is not 0%. */
export function pctOf(m: IUnitCoverageMetric | null | undefined): number | null {
  if (!m || m.total <= 0) return null;
  return Math.round((m.covered / m.total) * 10_000) / 100;
}

const pubMetric = (m: IUnitCoverageMetric | null | undefined) => ({
  covered: m?.covered ?? 0,
  total: m?.total ?? 0,
  pct: pctOf(m),
});

export function pubCoverage(c: IUnitCoverage | null | undefined) {
  if (!c) return null;
  return {
    lines: pubMetric(c.lines),
    branches: pubMetric(c.branches),
    functions: pubMetric(c.functions),
    statements: pubMetric(c.statements),
  };
}

export const pubCounts = (c: IUnitTestCounts | null | undefined) => ({
  suites: c?.suites ?? 0,
  suites_failed: c?.suites_failed ?? 0,
  tests: c?.tests ?? 0,
  passed: c?.passed ?? 0,
  failed: c?.failed ?? 0,
  skipped: c?.skipped ?? 0,
  todo: c?.todo ?? 0,
  duration_ms: c?.duration_ms ?? 0,
});

export const pubWorkspace = (w: IUnitTestWorkspace) => ({
  name: w.name,
  dir: w.dir,
  group: w.group,
  runner: w.runner,
  status: w.status,
  has_results: w.has_results,
  exit_code: w.exit_code,
  error: w.error,
  coverage: pubCoverage(w.coverage),
  ...pubCounts(w),
});

/** A run's own row. Lean documents and hydrated ones both read the same way. */
export type UnitRunLike = Pick<
  IUnitTestRun,
  | 'run_no'
  | 'status'
  | 'trigger'
  | 'workflow'
  | 'branch'
  | 'commit_sha'
  | 'github_run_id'
  | 'github_run_attempt'
  | 'github_run_url'
  | 'requested_by'
  | 'triggered_by'
  | 'started_at'
  | 'finished_at'
  | 'duration_ms'
  | 'totals'
  | 'coverage'
  | 'lines_pct'
  | 'error_message'
  | 'details_purged'
  | 'created_at'
> & { _id: unknown; workspaces?: IUnitTestWorkspace[] };

export const pubRun = (doc: UnitRunLike) => ({
  id: String(doc._id),
  run_no: doc.run_no,
  status: doc.status,
  trigger: doc.trigger,
  workflow: doc.workflow,
  branch: doc.branch,
  commit_sha: doc.commit_sha,
  github_run_id: doc.github_run_id,
  github_run_attempt: doc.github_run_attempt,
  github_run_url: doc.github_run_url,
  requested_by: doc.requested_by,
  triggered_by: doc.triggered_by,
  started_at: iso(doc.started_at),
  finished_at: iso(doc.finished_at),
  duration_ms: doc.duration_ms ?? null,
  totals: pubCounts(doc.totals),
  coverage: pubCoverage(doc.coverage),
  lines_pct: doc.lines_pct ?? null,
  workspaces: (doc.workspaces ?? []).map(pubWorkspace),
  error_message: doc.error_message,
  details_purged: doc.details_purged,
  created_at: iso(doc.created_at),
});

export const pubFile = (doc: IUnitTestFile) => ({
  id: String(doc._id),
  workspace: doc.workspace,
  path: doc.path,
  kind: doc.kind,
  status: doc.status,
  tests: doc.tests,
  passed: doc.passed,
  failed: doc.failed,
  skipped: doc.skipped,
  todo: doc.todo,
  duration_ms: doc.duration_ms,
  mocks: doc.mocks,
  gql_mocks: doc.gql_mocks,
  mock_count: doc.mock_count,
  has_mocks: doc.has_mocks,
  titles: doc.titles,
  failure_message: doc.failure_message,
});

export const pubCase = (doc: IUnitTestCase) => ({
  id: String(doc._id),
  workspace: doc.workspace,
  file: doc.file,
  ancestor_titles: doc.ancestor_titles,
  title: doc.title,
  full_name: doc.full_name,
  status: doc.status,
  duration_ms: doc.duration_ms,
  failure_message: doc.failure_message,
});

/* ── totals ─────────────────────────────────────────────────────────────────── */

const ZERO_COUNTS: IUnitTestCounts = {
  suites: 0,
  suites_failed: 0,
  tests: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  todo: 0,
  duration_ms: 0,
};

const COUNT_KEYS = Object.keys(ZERO_COUNTS) as (keyof IUnitTestCounts)[];
const METRIC_KEYS = ['lines', 'branches', 'functions', 'statements'] as const;

/** The run's arithmetic: every workspace's counts and coverage, summed. */
export function totalsOf(workspaces: readonly IUnitTestWorkspace[]): {
  totals: IUnitTestCounts;
  coverage: IUnitCoverage;
} {
  const totals = { ...ZERO_COUNTS };
  const coverage: IUnitCoverage = {
    lines: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
    statements: { covered: 0, total: 0 },
  };
  for (const ws of workspaces) {
    for (const key of COUNT_KEYS) totals[key] += ws[key] ?? 0;
    for (const key of METRIC_KEYS) {
      coverage[key].covered += ws.coverage?.[key]?.covered ?? 0;
      coverage[key].total += ws.coverage?.[key]?.total ?? 0;
    }
  }
  return { totals, coverage };
}
