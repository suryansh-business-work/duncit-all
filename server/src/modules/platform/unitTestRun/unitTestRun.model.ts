import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * One run of the unit suites, as CI reported it.
 *
 * Two workflows produce these: sonar.yml on every push to staging/main (the
 * coverage matrix the scanner reads), and coverage.yml nightly or on demand
 * from the Tests console. Neither runs anything new for this feature — the
 * suites already ran; these rows are what they said, kept after GitHub's log
 * and artifacts expire.
 *
 * QUEUED exists only for a run started from the console: dispatching a
 * workflow answers 204 with no run id, so the row is written first and the
 * workflow claims it by `dispatch_id`. A QUEUED or RUNNING row whose workflow
 * died says nothing more, so the sweeper times it out to CANCELLED rather than
 * leaving it spinning forever.
 */
export type UnitTestRunStatus = 'QUEUED' | 'RUNNING' | 'PASSED' | 'FAILED' | 'CANCELLED';
export const UNIT_RUN_STATUSES: readonly UnitTestRunStatus[] = ['QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'CANCELLED'];
export const LIVE_UNIT_RUN_STATUSES: readonly UnitTestRunStatus[] = ['QUEUED', 'RUNNING'];
export const FINISHED_UNIT_RUN_STATUSES: readonly UnitTestRunStatus[] = ['PASSED', 'FAILED'];

export type UnitTestRunTrigger = 'PUSH' | 'SCHEDULE' | 'PORTAL' | 'MANUAL';
export const UNIT_RUN_TRIGGERS: readonly UnitTestRunTrigger[] = ['PUSH', 'SCHEDULE', 'PORTAL', 'MANUAL'];

export type UnitTestWorkflow = 'SONAR' | 'COVERAGE';
export const UNIT_WORKFLOWS: readonly UnitTestWorkflow[] = ['SONAR', 'COVERAGE'];

export type UnitTestRunner = 'VITEST' | 'JEST' | 'OTHER';
export const UNIT_RUNNERS: readonly UnitTestRunner[] = ['VITEST', 'JEST', 'OTHER'];

/**
 * REUSED is sonar.yml's cache hit: the group's code was byte-identical to a run
 * that already passed through, so its suites were not run again and the
 * results it carries are that run's. ERROR is a workspace that produced no
 * results at all — it timed out, or died before the runner could report.
 */
export type UnitTestWorkspaceStatus = 'PASSED' | 'FAILED' | 'ERROR' | 'REUSED' | 'NO_TESTS';
export const UNIT_WORKSPACE_STATUSES: readonly UnitTestWorkspaceStatus[] = ['PASSED', 'FAILED', 'ERROR', 'REUSED', 'NO_TESTS'];

export type UnitTestFileKind = 'VITEST' | 'JEST' | 'CYPRESS_COMPONENT' | 'CYPRESS_E2E';
export const UNIT_FILE_KINDS: readonly UnitTestFileKind[] = ['VITEST', 'JEST', 'CYPRESS_COMPONENT', 'CYPRESS_E2E'];

/** NOT_RUN is a file the run never executed: a Cypress spec, or a suite outside the run's config. */
export type UnitTestFileStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_RUN';
export const UNIT_FILE_STATUSES: readonly UnitTestFileStatus[] = ['PASSED', 'FAILED', 'SKIPPED', 'NOT_RUN'];

export type UnitTestCaseStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'TODO';
export const UNIT_CASE_STATUSES: readonly UnitTestCaseStatus[] = ['PASSED', 'FAILED', 'SKIPPED', 'TODO'];

export interface IUnitCoverageMetric {
  covered: number;
  total: number;
}

/**
 * Covered/total rather than a percentage, so a run's total is the SUM of its
 * workspaces' — averaging percentages would weigh a three-line package the
 * same as the server. A metric with total 0 was not measured.
 */
export interface IUnitCoverage {
  lines: IUnitCoverageMetric;
  branches: IUnitCoverageMetric;
  functions: IUnitCoverageMetric;
  statements: IUnitCoverageMetric;
}

export interface IUnitTestCounts {
  suites: number;
  suites_failed: number;
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  duration_ms: number;
}

export interface IUnitTestWorkspace extends IUnitTestCounts {
  /** The package name, e.g. `admin-portal` or `@duncit/table`. */
  name: string;
  /** Repo-relative directory, e.g. `portals/admin`. */
  dir: string;
  /** The matrix group or surface that ran it, e.g. `small-portals`, `portal`. */
  group: string;
  runner: UnitTestRunner;
  status: UnitTestWorkspaceStatus;
  /** True when the run handed up per-test results for this workspace. */
  has_results: boolean;
  exit_code: number | null;
  /** Why there are no results — a timeout, a missing report. Empty otherwise. */
  error: string;
  coverage: IUnitCoverage | null;
}

export interface IUnitTestRun extends Document {
  _id: Types.ObjectId;
  /** Permanent, human-readable id (DUN-UT-000001) — never reused. */
  run_no: string;
  status: UnitTestRunStatus;
  trigger: UnitTestRunTrigger;
  workflow: UnitTestWorkflow;
  branch: string;
  commit_sha: string;
  /** Empty on a QUEUED row: GitHub has not started the run it asked for yet. */
  github_run_id: string;
  github_run_attempt: number;
  github_run_url: string;
  /** The console account that pressed Run now. Empty for every other trigger. */
  requested_by: string;
  /** The GitHub actor, or the console account for a dispatched run. */
  triggered_by: string;
  /** Joins the row written at dispatch to the workflow that fulfils it. */
  dispatch_id: string;
  started_at: Date | null;
  finished_at: Date | null;
  /** Wall-clock time from the claim to the finish. totals.duration_ms is the suites' own time, summed. */
  duration_ms: number | null;
  totals: IUnitTestCounts;
  coverage: IUnitCoverage;
  /** coverage.lines as a percentage, stored so the table can sort and filter on it. */
  lines_pct: number | null;
  workspaces: IUnitTestWorkspace[];
  error_message: string;
  /** Who the CI authenticated as when it reported. */
  reported_by: string;
  /**
   * The run's files and cases were pruned by the retention setting. The run's
   * own summary is kept — it is what the trend chart and the history read.
   */
  details_purged: boolean;
  created_at: Date;
  updated_at: Date;
}

const metricSchema = new Schema<IUnitCoverageMetric>(
  { covered: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
  { _id: false }
);

const coverageSchema = new Schema<IUnitCoverage>(
  {
    lines: { type: metricSchema, default: () => ({}) },
    branches: { type: metricSchema, default: () => ({}) },
    functions: { type: metricSchema, default: () => ({}) },
    statements: { type: metricSchema, default: () => ({}) },
  },
  { _id: false }
);

const countFields = {
  suites: { type: Number, default: 0 },
  suites_failed: { type: Number, default: 0 },
  tests: { type: Number, default: 0 },
  passed: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  skipped: { type: Number, default: 0 },
  todo: { type: Number, default: 0 },
  duration_ms: { type: Number, default: 0 },
};

const totalsSchema = new Schema<IUnitTestCounts>(countFields, { _id: false });

const workspaceSchema = new Schema<IUnitTestWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    dir: { type: String, default: '' },
    group: { type: String, default: '' },
    runner: { type: String, enum: UNIT_RUNNERS, default: 'OTHER' },
    status: { type: String, enum: UNIT_WORKSPACE_STATUSES, default: 'ERROR' },
    has_results: { type: Boolean, default: false },
    exit_code: { type: Number, default: null },
    error: { type: String, default: '' },
    coverage: { type: coverageSchema, default: null },
    ...countFields,
  },
  { _id: false }
);

const unitTestRunSchema = new Schema<IUnitTestRun>(
  {
    run_no: { type: String, required: true, unique: true },
    status: { type: String, enum: UNIT_RUN_STATUSES, default: 'QUEUED', index: true },
    trigger: { type: String, enum: UNIT_RUN_TRIGGERS, default: 'MANUAL' },
    workflow: { type: String, enum: UNIT_WORKFLOWS, required: true },
    branch: { type: String, default: '' },
    commit_sha: { type: String, default: '' },
    github_run_id: { type: String, default: '' },
    github_run_attempt: { type: Number, default: 1 },
    github_run_url: { type: String, default: '' },
    requested_by: { type: String, default: '' },
    triggered_by: { type: String, default: '' },
    dispatch_id: { type: String, default: '' },
    started_at: { type: Date, default: null },
    finished_at: { type: Date, default: null },
    duration_ms: { type: Number, default: null },
    totals: { type: totalsSchema, default: () => ({}) },
    coverage: { type: coverageSchema, default: () => ({}) },
    lines_pct: { type: Number, default: null },
    workspaces: { type: [workspaceSchema], default: [] },
    error_message: { type: String, default: '' },
    reported_by: { type: String, default: '' },
    details_purged: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The table's default order.
unitTestRunSchema.index({ created_at: -1 });

// One row per GitHub run attempt — what makes a re-sent claim land on the same
// row. Partial, because a QUEUED row has no run id yet and several may wait at
// once.
unitTestRunSchema.index(
  { workflow: 1, github_run_id: 1, github_run_attempt: 1 },
  { unique: true, partialFilterExpression: { github_run_id: { $type: 'string', $gt: '' } } }
);

// How a dispatched row is found by the workflow that fulfils it.
unitTestRunSchema.index({ dispatch_id: 1 }, { partialFilterExpression: { dispatch_id: { $type: 'string', $gt: '' } } });

// The previous finished run of the same workflow on the same branch (the
// regression baseline), the latest finished run (dashboard, inventory) and the
// retention sweep all walk this.
unitTestRunSchema.index({ status: 1, finished_at: -1 });
unitTestRunSchema.index({ workflow: 1, branch: 1, status: 1, finished_at: -1 });

// The sweeper's stuck-run lookup.
unitTestRunSchema.index({ status: 1, updated_at: 1 });

export const UnitTestRunModel = model<IUnitTestRun>('UnitTestRun', unitTestRunSchema);

/* ── per-file and per-test records ─────────────────────────────────────────── */

export interface IUnitTestFile extends Document {
  run_id: Types.ObjectId;
  workspace: string;
  /** Repo-relative path, e.g. `portals/admin/src/__tests__/x.test.tsx`. */
  path: string;
  kind: UnitTestFileKind;
  status: UnitTestFileStatus;
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  duration_ms: number;
  /** Module specifiers the file mocks (`vi.mock`, `jest.mock`, `doMock`). */
  mocks: string[];
  /** GraphQL operations (or documents) the file stubs. */
  gql_mocks: string[];
  /** mocks.length + gql_mocks.length — what the mocks column sorts on. */
  mock_count: number;
  /** mock_count > 0, stored so the table's yes/no filter has a field to match. */
  has_mocks: boolean;
  /** The `it(…)` titles of a file that was not run, read from its source. */
  titles: string[];
  /** Why the whole file failed before any test ran (a broken import). */
  failure_message: string;
}

const unitTestFileSchema = new Schema<IUnitTestFile>(
  {
    run_id: { type: Schema.Types.ObjectId, required: true },
    workspace: { type: String, required: true },
    path: { type: String, required: true },
    kind: { type: String, enum: UNIT_FILE_KINDS, required: true },
    status: { type: String, enum: UNIT_FILE_STATUSES, required: true },
    tests: { type: Number, default: 0 },
    passed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    todo: { type: Number, default: 0 },
    duration_ms: { type: Number, default: 0 },
    mocks: { type: [String], default: [] },
    gql_mocks: { type: [String], default: [] },
    mock_count: { type: Number, default: 0 },
    has_mocks: { type: Boolean, default: false },
    titles: { type: [String], default: [] },
    failure_message: { type: String, default: '' },
  },
  { versionKey: false }
);

// The write key: a re-sent chunk replaces the same rows instead of adding more.
unitTestFileSchema.index({ run_id: 1, workspace: 1, path: 1 }, { unique: true });
unitTestFileSchema.index({ run_id: 1, path: 1 });
unitTestFileSchema.index({ run_id: 1, kind: 1, status: 1 });
unitTestFileSchema.index({ run_id: 1, mock_count: -1 });

export const UnitTestFileModel = model<IUnitTestFile>('UnitTestFile', unitTestFileSchema);

export interface IUnitTestCase extends Document {
  run_id: Types.ObjectId;
  /**
   * workspace + file + full name + ordinal, hashed. The ordinal tells apart two
   * tests a file names identically, so the key is unique AND the same in every
   * run — which is what lets the regression report line two runs up.
   */
  case_key: string;
  workspace: string;
  file: string;
  ancestor_titles: string[];
  title: string;
  full_name: string;
  status: UnitTestCaseStatus;
  duration_ms: number | null;
  failure_message: string;
}

const unitTestCaseSchema = new Schema<IUnitTestCase>(
  {
    run_id: { type: Schema.Types.ObjectId, required: true },
    case_key: { type: String, required: true },
    workspace: { type: String, required: true },
    file: { type: String, required: true },
    ancestor_titles: { type: [String], default: [] },
    title: { type: String, default: '' },
    full_name: { type: String, default: '' },
    status: { type: String, enum: UNIT_CASE_STATUSES, required: true },
    duration_ms: { type: Number, default: null },
    failure_message: { type: String, default: '' },
  },
  { versionKey: false }
);

unitTestCaseSchema.index({ run_id: 1, case_key: 1 }, { unique: true });
unitTestCaseSchema.index({ run_id: 1, status: 1 });
unitTestCaseSchema.index({ run_id: 1, workspace: 1, file: 1 });
unitTestCaseSchema.index({ run_id: 1, duration_ms: -1 });

export const UnitTestCaseModel = model<IUnitTestCase>('UnitTestCase', unitTestCaseSchema);

/* ── settings and the run counter ──────────────────────────────────────────── */

export const UNIT_SETTINGS_KEY = 'unit_test_run';
export const DEFAULT_RETENTION_RUNS = 30;
export const MIN_RETENTION_RUNS = 1;
export const MAX_RETENTION_RUNS = 500;

export interface IUnitTestSettings extends Document {
  key: string;
  /**
   * How many finished runs keep their files and test cases. Older runs keep
   * their summary — the trend needs it — and lose the per-test detail, which
   * is tens of thousands of rows a run.
   */
  retention_runs: number;
  created_at: Date;
  updated_at: Date;
}

const unitTestSettingsSchema = new Schema<IUnitTestSettings>(
  {
    key: { type: String, required: true, unique: true },
    retention_runs: { type: Number, default: DEFAULT_RETENTION_RUNS, min: MIN_RETENTION_RUNS, max: MAX_RETENTION_RUNS },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const UnitTestSettingsModel = model<IUnitTestSettings>('UnitTestSettings', unitTestSettingsSchema);

interface IUnitTestRunCounter extends Document {
  singleton_key: string;
  seq: number;
}

const unitTestRunCounterSchema = new Schema<IUnitTestRunCounter>({
  singleton_key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const UnitTestRunCounterModel = model<IUnitTestRunCounter>('UnitTestRunCounter', unitTestRunCounterSchema);

/** Next globally unique run id, e.g. `DUN-UT-000001` — never reused. */
export async function nextUnitRunNo(): Promise<string> {
  const doc = await UnitTestRunCounterModel.findOneAndUpdate(
    { singleton_key: UNIT_SETTINGS_KEY },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `DUN-UT-${String(doc.seq).padStart(6, '0')}`;
}
