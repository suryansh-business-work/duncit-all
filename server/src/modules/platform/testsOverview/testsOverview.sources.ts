import { E2eRunModel } from '@modules/platform/e2eRun/e2eRun.model';
import { E2eFlowModel } from '@modules/platform/e2eFlow/e2eFlow.model';
import { StressRunModel, type StressVerdictGrade } from '@modules/platform/stressTest/stressTest.model';
import { pct } from './testsOverview.score';

/** The latest E2E sweep that finished, and the share of its tests that passed. */
export async function latestE2e() {
  const run = await E2eRunModel.findOne(
    { status: { $in: ['SUCCESS', 'FAILED'] } },
    { run_no: 1, status: 1, ref: 1, totals: 1, workflow_run_url: 1, updated_at: 1 }
  )
    .sort({ created_at: -1, _id: -1 })
    .lean();
  if (!run) return { run: null, passRate: null };
  const { passed, failed } = run.totals;
  return {
    run: {
      id: String(run._id),
      run_no: run.run_no,
      status: run.status,
      ref: run.ref,
      finished_at: run.updated_at,
      workflow_run_url: run.workflow_run_url,
      ...run.totals,
    },
    passRate: pct(passed, passed + failed),
  };
}

/**
 * Scenario coverage: how much of the E2E flow catalogue — every journey the
 * codebase has, sub flow by sub flow — a person has reviewed as LOOKS_GOOD
 * (ready to be an automated test).
 */
export async function scenarioCoverage() {
  const [row] = await E2eFlowModel.aggregate<{
    flows: number;
    sub_flows: number;
    looks_good: number;
    needs_review: number;
  }>([
    { $project: { sub_flows: { $ifNull: ['$sub_flows', []] } } },
    {
      $group: {
        _id: null,
        flows: { $sum: 1 },
        sub_flows: { $sum: { $size: '$sub_flows' } },
        looks_good: {
          $sum: { $size: { $filter: { input: '$sub_flows', cond: { $eq: ['$$this.review_status', 'LOOKS_GOOD'] } } } },
        },
        needs_review: {
          $sum: { $size: { $filter: { input: '$sub_flows', cond: { $eq: ['$$this.review_status', 'NEEDS_REVIEW'] } } } },
        },
      },
    },
  ]);
  const totals = row ?? { flows: 0, sub_flows: 0, looks_good: 0, needs_review: 0 };
  return {
    flows: totals.flows,
    sub_flows: totals.sub_flows,
    looks_good: totals.looks_good,
    needs_review: totals.needs_review,
    not_reviewed: Math.max(0, totals.sub_flows - totals.looks_good - totals.needs_review),
    pct: pct(totals.looks_good, totals.sub_flows),
  };
}

/**
 * How a stress run's AI verdict reads as health. A run nobody asked a verdict
 * for falls back to its outcome: it held to the end inside every guardrail, a
 * guardrail stopped it, or the host was about to fall over and it was
 * terminated. A run that FAILED never measured anything, so it says nothing.
 */
const GRADE_HEALTH: Readonly<Record<StressVerdictGrade, number | null>> = {
  HEALTHY: 100,
  STRAINED: 60,
  OVERLOADED: 20,
  INCONCLUSIVE: null,
};
const OUTCOME_HEALTH = { COMPLETED: 100, ABORTED: 40, TERMINATED: 0 } as const;

/** The latest stress run on THIS environment that ended, and how healthy it left the platform. */
export async function latestStress() {
  const run = await StressRunModel.findOne(
    { status: { $in: ['COMPLETED', 'ABORTED'] } },
    { run_no: 1, status: 1, terminated: 1, verdict: 1, ended_at: 1 }
  )
    .sort({ created_at: -1, _id: -1 })
    .lean();
  if (!run) return { run: null, health: null };
  const grade = run.verdict?.grade ?? null;
  let health: number | null;
  if (grade) health = GRADE_HEALTH[grade];
  else if (run.terminated) health = OUTCOME_HEALTH.TERMINATED;
  else health = run.status === 'COMPLETED' ? OUTCOME_HEALTH.COMPLETED : OUTCOME_HEALTH.ABORTED;
  return {
    run: {
      id: String(run._id),
      run_no: run.run_no,
      status: run.status,
      // Runs saved before the field existed have none, and lean() skips defaults.
      terminated: run.terminated ?? false,
      grade,
      ended_at: run.ended_at,
    },
    health,
  };
}
