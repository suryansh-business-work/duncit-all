import type { Types } from 'mongoose';
import {
  E2eScenarioResultModel,
  type E2eScenarioState,
  type IE2eSuiteResult,
} from '@modules/platform/e2eRun/e2eRun.model';
import type { IRegressionCounts, RegressionBucket } from './regressionReport.model';
import { BucketCollector, classify, type RegressionItemDraft } from './regressionReport.unit';

/**
 * The E2E comparison scenario by scenario: every `it()` of this run against
 * the same `it()` (its case_key) in the previous finished run.
 *
 * Only suites both runs actually judged (PASSED or FAILED) are compared. A
 * suite one side skipped or never finished would otherwise read as hundreds of
 * new or removed scenarios — "nobody ran it" is not "it changed".
 *
 * A scenario Cypress skipped or left pending (a failed hook blocks the tests
 * after it) is not judged either way: the hook's own failure is the signal.
 */

const JUDGED_SUITE = new Set(['PASSED', 'FAILED']);

export interface ScenarioComparison {
  counts: IRegressionCounts;
  items: RegressionItemDraft[];
  truncated: boolean;
  /** Suites left out because one of the runs did not judge them. */
  skipped_suites: string[];
}

type SuiteResults = readonly Pick<IE2eSuiteResult, 'key' | 'status'>[];

/** The suites both runs judged, and the ones that only one side (or neither) did. */
export function comparableSuites(current: SuiteResults, base: SuiteResults): { compared: Set<string>; skipped: string[] } {
  const now = new Map(current.map((s) => [s.key, s.status]));
  const before = new Map(base.map((s) => [s.key, s.status]));
  const compared = new Set<string>();
  const skipped: string[] = [];
  for (const key of new Set([...now.keys(), ...before.keys()])) {
    if (JUDGED_SUITE.has(now.get(key) ?? '') && JUDGED_SUITE.has(before.get(key) ?? '')) compared.add(key);
    else skipped.push(key);
  }
  skipped.sort((a, b) => a.localeCompare(b));
  return { compared, skipped };
}

/** True when the run reported its scenarios — runs before 2026-10-30 only have suite counts. */
export async function hasScenarios(runId: Types.ObjectId): Promise<boolean> {
  return (await E2eScenarioResultModel.exists({ run_id: runId })) !== null;
}

const SCENARIO_FIELDS = { case_key: 1, suite: 1, project: 1, spec: 1, title_path: 1, title: 1, state: 1, error: 1 };

interface ScenarioRow {
  case_key: string;
  suite: string;
  project: string;
  spec: string;
  title_path: string[];
  title: string;
  state: E2eScenarioState;
  error: string;
}

const draftOf = (bucket: RegressionBucket, row: ScenarioRow): RegressionItemDraft => ({
  bucket,
  workspace: row.suite,
  file: row.project ? `${row.project}/${row.spec}` : row.spec,
  full_name: row.title_path.join(' › '),
  title: row.title,
  failure_message: bucket !== 'REMOVED_TESTS' && row.state === 'FAILED' ? row.error : '',
});

/** Every scenario of the run against the baseline, streamed so neither run is held twice. */
export async function compareE2eScenarios(
  run: { _id: Types.ObjectId; results: SuiteResults },
  base: { _id: Types.ObjectId; results: SuiteResults }
): Promise<ScenarioComparison> {
  const scope = comparableSuites(run.results, base.results);
  const suites = [...scope.compared];
  const baseState = new Map<string, E2eScenarioState>();
  const baseCursor = E2eScenarioResultModel.find({ run_id: base._id, suite: { $in: suites } }, { case_key: 1, state: 1 })
    .lean()
    .cursor();
  for await (const s of baseCursor) baseState.set(s.case_key, s.state);

  const collector = new BucketCollector();
  const seen = new Set<string>();
  const cursor = E2eScenarioResultModel.find({ run_id: run._id, suite: { $in: suites } }, SCENARIO_FIELDS)
    .lean()
    .cursor();
  for await (const s of cursor) {
    seen.add(s.case_key);
    const bucket = classify(baseState.get(s.case_key), s.state);
    if (bucket && collector.add(bucket)) collector.items.push(draftOf(bucket, s));
  }

  const removedKeys: string[] = [];
  for (const key of baseState.keys()) {
    if (seen.has(key)) continue;
    if (collector.add('REMOVED_TESTS')) removedKeys.push(key);
  }
  if (removedKeys.length > 0) {
    const removed = await E2eScenarioResultModel.find(
      { run_id: base._id, case_key: { $in: removedKeys } },
      SCENARIO_FIELDS
    ).lean();
    for (const s of removed) collector.items.push(draftOf('REMOVED_TESTS', s));
  }

  return {
    counts: collector.counts,
    items: collector.items,
    truncated: collector.truncated,
    skipped_suites: scope.skipped,
  };
}
