import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * What changed between a finished run and the run before it.
 *
 * One report per run, for unit runs (test by test) and E2E runs (suite by
 * suite). The baseline is the previous finished run of the same kind on the
 * same branch — and, for unit runs, of the same workflow, because sonar.yml
 * and coverage.yml run different sets of workspaces.
 *
 * BUILDING is the report's own lock: whoever set it is building, and readers
 * only ever see READY reports.
 */
export type RegressionKind = 'UNIT' | 'E2E';
export const REGRESSION_KINDS: readonly RegressionKind[] = ['UNIT', 'E2E'];

/** REGRESSED when something that passed now fails, or a new test fails. */
export type RegressionStatus = 'CLEAN' | 'REGRESSED';
export const REGRESSION_STATUSES: readonly RegressionStatus[] = ['CLEAN', 'REGRESSED'];

export type RegressionState = 'BUILDING' | 'READY';

export type RegressionBucket =
  | 'REGRESSED'
  | 'FIXED'
  | 'STILL_FAILING'
  | 'NEW_FAILING'
  | 'NEW_TESTS'
  | 'REMOVED_TESTS';
export const REGRESSION_BUCKETS: readonly RegressionBucket[] = [
  'REGRESSED',
  'FIXED',
  'STILL_FAILING',
  'NEW_FAILING',
  'NEW_TESTS',
  'REMOVED_TESTS',
];

export interface IRegressionCounts {
  regressed: number;
  fixed: number;
  still_failing: number;
  new_failing: number;
  new_tests: number;
  removed_tests: number;
}

/** Coverage before and after, as percentages; null where one side measured nothing. */
export interface IRegressionCoverageDelta {
  /** A workspace name, or '' for the run's total. */
  workspace: string;
  lines_before: number | null;
  lines_after: number | null;
  branches_before: number | null;
  branches_after: number | null;
  functions_before: number | null;
  functions_after: number | null;
  statements_before: number | null;
  statements_after: number | null;
}

/** One E2E suite, side by side. */
export interface IRegressionSuiteDelta {
  suite: string;
  status_before: string;
  status_after: string;
  passed_before: number | null;
  passed_after: number | null;
  failed_before: number | null;
  failed_after: number | null;
  tests_before: number | null;
  tests_after: number | null;
}

export interface IRegressionReport extends Document {
  _id: Types.ObjectId;
  kind: RegressionKind;
  run_id: Types.ObjectId;
  state: RegressionState;
  building_since: Date | null;
  status: RegressionStatus;
  run_no: string;
  base_run_id: Types.ObjectId | null;
  base_run_no: string;
  branch: string;
  /** SONAR or COVERAGE for a unit run; empty for E2E. */
  workflow: string;
  counts: IRegressionCounts;
  /** How many items each bucket kept — every regression, the rest capped. */
  items_kept: number;
  /** True when a bucket held more than its cap; the counts stay exact. */
  truncated: boolean;
  /** Workspaces that could not be compared: one side has no results for them. */
  skipped_workspaces: string[];
  coverage_total: IRegressionCoverageDelta | null;
  coverage_workspaces: IRegressionCoverageDelta[];
  suites: IRegressionSuiteDelta[];
  /** Set when the item list was trimmed by retention; the counts stay. */
  items_purged: boolean;
  created_at: Date;
  updated_at: Date;
}

const countsSchema = new Schema<IRegressionCounts>(
  {
    regressed: { type: Number, default: 0 },
    fixed: { type: Number, default: 0 },
    still_failing: { type: Number, default: 0 },
    new_failing: { type: Number, default: 0 },
    new_tests: { type: Number, default: 0 },
    removed_tests: { type: Number, default: 0 },
  },
  { _id: false }
);

const coverageDeltaSchema = new Schema<IRegressionCoverageDelta>(
  {
    workspace: { type: String, default: '' },
    lines_before: { type: Number, default: null },
    lines_after: { type: Number, default: null },
    branches_before: { type: Number, default: null },
    branches_after: { type: Number, default: null },
    functions_before: { type: Number, default: null },
    functions_after: { type: Number, default: null },
    statements_before: { type: Number, default: null },
    statements_after: { type: Number, default: null },
  },
  { _id: false }
);

const suiteDeltaSchema = new Schema<IRegressionSuiteDelta>(
  {
    suite: { type: String, required: true },
    status_before: { type: String, default: '' },
    status_after: { type: String, default: '' },
    passed_before: { type: Number, default: null },
    passed_after: { type: Number, default: null },
    failed_before: { type: Number, default: null },
    failed_after: { type: Number, default: null },
    tests_before: { type: Number, default: null },
    tests_after: { type: Number, default: null },
  },
  { _id: false }
);

const regressionReportSchema = new Schema<IRegressionReport>(
  {
    kind: { type: String, enum: REGRESSION_KINDS, required: true },
    run_id: { type: Schema.Types.ObjectId, required: true },
    state: { type: String, enum: ['BUILDING', 'READY'], default: 'BUILDING' },
    building_since: { type: Date, default: null },
    status: { type: String, enum: REGRESSION_STATUSES, default: 'CLEAN' },
    run_no: { type: String, default: '' },
    base_run_id: { type: Schema.Types.ObjectId, default: null },
    base_run_no: { type: String, default: '' },
    branch: { type: String, default: '' },
    workflow: { type: String, default: '' },
    counts: { type: countsSchema, default: () => ({}) },
    items_kept: { type: Number, default: 0 },
    truncated: { type: Boolean, default: false },
    skipped_workspaces: { type: [String], default: [] },
    coverage_total: { type: coverageDeltaSchema, default: null },
    coverage_workspaces: { type: [coverageDeltaSchema], default: [] },
    suites: { type: [suiteDeltaSchema], default: [] },
    items_purged: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One report per run: the lock and the idempotency both stand on this.
regressionReportSchema.index({ kind: 1, run_id: 1 }, { unique: true });
regressionReportSchema.index({ state: 1, created_at: -1 });
regressionReportSchema.index({ kind: 1, state: 1, created_at: -1 });

export const RegressionReportModel = model<IRegressionReport>('RegressionReport', regressionReportSchema);

/** One test (unit) that landed in a bucket. */
export interface IRegressionItem extends Document {
  report_id: Types.ObjectId;
  bucket: RegressionBucket;
  workspace: string;
  file: string;
  full_name: string;
  title: string;
  /** The failure as the newer run reported it; empty for a passing test. */
  failure_message: string;
}

const regressionItemSchema = new Schema<IRegressionItem>(
  {
    report_id: { type: Schema.Types.ObjectId, required: true },
    bucket: { type: String, enum: REGRESSION_BUCKETS, required: true },
    workspace: { type: String, default: '' },
    file: { type: String, default: '' },
    full_name: { type: String, default: '' },
    title: { type: String, default: '' },
    failure_message: { type: String, default: '' },
  },
  { versionKey: false }
);

regressionItemSchema.index({ report_id: 1, bucket: 1, workspace: 1, file: 1 });

export const RegressionItemModel = model<IRegressionItem>('RegressionItem', regressionItemSchema);
