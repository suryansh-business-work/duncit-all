import type { Types } from 'mongoose';
import {
  FINISHED_UNIT_RUN_STATUSES,
  UnitTestCaseModel,
  UnitTestRunModel,
  type IUnitCoverage,
  type IUnitTestRun,
  type IUnitTestWorkspace,
  type UnitTestCaseStatus,
} from '@modules/platform/unitTestRun/unitTestRun.model';
import { pctOf } from '@modules/platform/unitTestRun/unitTestRun.public';
import type {
  IRegressionCounts,
  IRegressionCoverageDelta,
  RegressionBucket,
} from './regressionReport.model';

/**
 * The unit-run comparison: every test, keyed on workspace + file + full name
 * (+ ordinal, for two tests a file names identically), in this run against
 * the previous finished run of the same workflow on the same branch.
 */

/** How many items each bucket keeps. Every regression is kept; the rest are a sample with exact counts. */
export const BUCKET_CAPS: Record<RegressionBucket, number> = {
  REGRESSED: 5000,
  NEW_FAILING: 1000,
  STILL_FAILING: 500,
  FIXED: 500,
  NEW_TESTS: 500,
  REMOVED_TESTS: 500,
};

const COUNT_FIELD: Record<RegressionBucket, keyof IRegressionCounts> = {
  REGRESSED: 'regressed',
  FIXED: 'fixed',
  STILL_FAILING: 'still_failing',
  NEW_FAILING: 'new_failing',
  NEW_TESTS: 'new_tests',
  REMOVED_TESTS: 'removed_tests',
};

export interface RegressionItemDraft {
  bucket: RegressionBucket;
  workspace: string;
  file: string;
  full_name: string;
  title: string;
  failure_message: string;
}

export interface UnitComparison {
  counts: IRegressionCounts;
  items: RegressionItemDraft[];
  truncated: boolean;
  skipped_workspaces: string[];
  coverage_total: IRegressionCoverageDelta;
  coverage_workspaces: IRegressionCoverageDelta[];
}

type RunForCompare = Pick<IUnitTestRun, 'workspaces' | 'coverage'> & { _id: Types.ObjectId };

/** Which bucket a test lands in, or null when nothing worth reporting changed. */
export function classify(before: UnitTestCaseStatus | undefined, after: UnitTestCaseStatus): RegressionBucket | null {
  if (before === undefined) return after === 'FAILED' ? 'NEW_FAILING' : 'NEW_TESTS';
  if (before === 'PASSED' && after === 'FAILED') return 'REGRESSED';
  if (before === 'FAILED' && after === 'PASSED') return 'FIXED';
  if (before === 'FAILED' && after === 'FAILED') return 'STILL_FAILING';
  return null;
}

/**
 * The workspaces each side may be read for. A workspace with no results on
 * either side — it timed out, or a cache replay carried none — is left out of
 * BOTH, or every one of its tests would read as removed or new. A workspace
 * that only exists on one side is compared: that is a real addition or removal.
 */
export function comparableWorkspaces(
  current: readonly IUnitTestWorkspace[],
  base: readonly IUnitTestWorkspace[]
): { current: Set<string>; base: Set<string>; skipped: string[] } {
  const now = new Map(current.map((ws) => [ws.name, ws.has_results]));
  const before = new Map(base.map((ws) => [ws.name, ws.has_results]));
  const names = new Set([...now.keys(), ...before.keys()]);
  const out = { current: new Set<string>(), base: new Set<string>(), skipped: [] as string[] };
  for (const name of names) {
    const nowOk = now.get(name);
    const beforeOk = before.get(name);
    if (nowOk === false || beforeOk === false) {
      out.skipped.push(name);
      continue;
    }
    if (nowOk) out.current.add(name);
    if (beforeOk) out.base.add(name);
  }
  out.skipped.sort((a, b) => a.localeCompare(b));
  return out;
}

const deltaOf = (
  workspace: string,
  before: IUnitCoverage | null | undefined,
  after: IUnitCoverage | null | undefined
): IRegressionCoverageDelta => ({
  workspace,
  lines_before: pctOf(before?.lines),
  lines_after: pctOf(after?.lines),
  branches_before: pctOf(before?.branches),
  branches_after: pctOf(after?.branches),
  functions_before: pctOf(before?.functions),
  functions_after: pctOf(after?.functions),
  statements_before: pctOf(before?.statements),
  statements_after: pctOf(after?.statements),
});

function coverageDeltas(run: RunForCompare, base: RunForCompare): IRegressionCoverageDelta[] {
  const before = new Map(base.workspaces.map((ws) => [ws.name, ws.coverage]));
  const after = new Map(run.workspaces.map((ws) => [ws.name, ws.coverage]));
  const names = [...new Set([...before.keys(), ...after.keys()])].sort((a, b) => a.localeCompare(b));
  return names
    .filter((name) => before.get(name) || after.get(name))
    .map((name) => deltaOf(name, before.get(name), after.get(name)));
}

/** Collects bucket items up to each cap, counting every one. */
class BucketCollector {
  readonly counts: IRegressionCounts = {
    regressed: 0,
    fixed: 0,
    still_failing: 0,
    new_failing: 0,
    new_tests: 0,
    removed_tests: 0,
  };
  readonly items: RegressionItemDraft[] = [];
  truncated = false;

  /** True when the item should be kept (the caller may need to fetch its detail). */
  add(bucket: RegressionBucket): boolean {
    const field = COUNT_FIELD[bucket];
    this.counts[field] += 1;
    if (this.counts[field] <= BUCKET_CAPS[bucket]) return true;
    this.truncated = true;
    return false;
  }
}

/** The baseline: the previous finished run of the same workflow on the same branch, detail intact. */
export async function findUnitBase(run: Pick<IUnitTestRun, '_id' | 'workflow' | 'branch' | 'created_at'>) {
  return UnitTestRunModel.findOne(
    {
      _id: { $ne: run._id },
      workflow: run.workflow,
      branch: run.branch,
      status: { $in: FINISHED_UNIT_RUN_STATUSES },
      details_purged: false,
      created_at: { $lt: run.created_at },
    },
    { run_no: 1, workspaces: 1, coverage: 1 }
  )
    .sort({ created_at: -1 })
    .lean();
}

/** Every test of the run against the baseline, streamed so neither run is held twice. */
export async function compareUnitRuns(run: RunForCompare, base: RunForCompare): Promise<UnitComparison> {
  const scope = comparableWorkspaces(run.workspaces, base.workspaces);
  const baseStatus = new Map<string, UnitTestCaseStatus>();
  const baseCursor = UnitTestCaseModel.find({ run_id: base._id }, { case_key: 1, status: 1, workspace: 1 })
    .lean()
    .cursor();
  for await (const c of baseCursor) {
    if (scope.base.has(c.workspace)) baseStatus.set(c.case_key, c.status);
  }

  const collector = new BucketCollector();
  const seen = new Set<string>();
  const cursor = UnitTestCaseModel.find(
    { run_id: run._id },
    { case_key: 1, status: 1, workspace: 1, file: 1, full_name: 1, title: 1, failure_message: 1 }
  )
    .lean()
    .cursor();
  for await (const c of cursor) {
    if (!scope.current.has(c.workspace)) continue;
    seen.add(c.case_key);
    const bucket = classify(baseStatus.get(c.case_key), c.status);
    if (bucket && collector.add(bucket)) {
      collector.items.push({
        bucket,
        workspace: c.workspace,
        file: c.file,
        full_name: c.full_name,
        title: c.title,
        failure_message: c.status === 'FAILED' ? c.failure_message : '',
      });
    }
  }

  const removedKeys: string[] = [];
  for (const key of baseStatus.keys()) {
    if (seen.has(key)) continue;
    if (collector.add('REMOVED_TESTS')) removedKeys.push(key);
  }
  if (removedKeys.length > 0) {
    const removed = await UnitTestCaseModel.find(
      { run_id: base._id, case_key: { $in: removedKeys } },
      { workspace: 1, file: 1, full_name: 1, title: 1 }
    ).lean();
    for (const c of removed) {
      collector.items.push({
        bucket: 'REMOVED_TESTS',
        workspace: c.workspace,
        file: c.file,
        full_name: c.full_name,
        title: c.title,
        failure_message: '',
      });
    }
  }

  return {
    counts: collector.counts,
    items: collector.items,
    truncated: collector.truncated,
    skipped_workspaces: scope.skipped,
    coverage_total: deltaOf('', base.coverage, run.coverage),
    coverage_workspaces: coverageDeltas(run, base),
  };
}
