import type { Types } from 'mongoose';
import { E2eRunModel, type IE2eRun, type IE2eSuiteResult } from '@modules/platform/e2eRun/e2eRun.model';
import type { IRegressionCounts, IRegressionSuiteDelta, RegressionBucket } from './regressionReport.model';

/**
 * The E2E comparison: suite by suite, this run against the previous finished
 * run on the same branch. A suite that one side SKIPPED (the operator did not
 * select it) or never finished is listed but not judged — "nobody ran it" is
 * not "it broke" or "it was fixed".
 */

const FINISHED = ['SUCCESS', 'FAILED'];
const JUDGED = new Set(['PASSED', 'FAILED']);

export type E2eRunForCompare = Pick<IE2eRun, 'run_no' | 'ref' | 'status' | 'results' | 'created_at'> & {
  _id: Types.ObjectId;
};

export interface E2eComparison {
  counts: IRegressionCounts;
  suites: IRegressionSuiteDelta[];
}

export async function loadE2eRun(id: string): Promise<E2eRunForCompare | null> {
  return E2eRunModel.findById(id, { run_no: 1, ref: 1, status: 1, results: 1, created_at: 1 }).lean();
}

export function isFinishedE2e(run: Pick<IE2eRun, 'status'>): boolean {
  return FINISHED.includes(run.status);
}

export async function findE2eBase(run: E2eRunForCompare): Promise<E2eRunForCompare | null> {
  return E2eRunModel.findOne(
    { _id: { $ne: run._id }, ref: run.ref, status: { $in: FINISHED }, created_at: { $lt: run.created_at } },
    { run_no: 1, ref: 1, status: 1, results: 1, created_at: 1 }
  )
    .sort({ created_at: -1 })
    .lean();
}

/** Which bucket one suite's change lands in. */
export function suiteBucket(
  before: IE2eSuiteResult | undefined,
  after: IE2eSuiteResult | undefined
): RegressionBucket | null {
  const was = before && JUDGED.has(before.status) ? before.status : null;
  const now = after && JUDGED.has(after.status) ? after.status : null;
  if (!before && now) return now === 'FAILED' ? 'NEW_FAILING' : 'NEW_TESTS';
  if (was && !after) return 'REMOVED_TESTS';
  if (was === 'PASSED' && now === 'FAILED') return 'REGRESSED';
  if (was === 'FAILED' && now === 'PASSED') return 'FIXED';
  if (was === 'FAILED' && now === 'FAILED') return 'STILL_FAILING';
  return null;
}

const COUNT_FIELD: Record<RegressionBucket, keyof IRegressionCounts> = {
  REGRESSED: 'regressed',
  FIXED: 'fixed',
  STILL_FAILING: 'still_failing',
  NEW_FAILING: 'new_failing',
  NEW_TESTS: 'new_tests',
  REMOVED_TESTS: 'removed_tests',
};

export function compareE2eRuns(run: E2eRunForCompare, base: E2eRunForCompare): E2eComparison {
  const before = new Map(base.results.map((r) => [r.key, r]));
  const after = new Map(run.results.map((r) => [r.key, r]));
  const keys = [...new Set([...before.keys(), ...after.keys()])].sort((a, b) => a.localeCompare(b));
  const counts: IRegressionCounts = {
    regressed: 0,
    fixed: 0,
    still_failing: 0,
    new_failing: 0,
    new_tests: 0,
    removed_tests: 0,
  };
  const suites = keys.map((suite): IRegressionSuiteDelta => {
    const b = before.get(suite);
    const a = after.get(suite);
    const bucket = suiteBucket(b, a);
    if (bucket) counts[COUNT_FIELD[bucket]] += 1;
    return {
      suite,
      status_before: b?.status ?? '',
      status_after: a?.status ?? '',
      passed_before: b?.passed ?? null,
      passed_after: a?.passed ?? null,
      failed_before: b?.failed ?? null,
      failed_after: a?.failed ?? null,
      tests_before: b?.tests ?? null,
      tests_after: a?.tests ?? null,
    };
  });
  return { counts, suites };
}
