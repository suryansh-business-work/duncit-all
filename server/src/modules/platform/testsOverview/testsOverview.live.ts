import { E2eRunModel } from '@modules/platform/e2eRun/e2eRun.model';
import { LIVE_UNIT_RUN_STATUSES, UnitTestRunModel } from '@modules/platform/unitTestRun/unitTestRun.model';
import { LIVE_STATUSES as LIVE_STRESS_STATUSES, StressRunModel } from '@modules/platform/stressTest/stressTest.model';

/**
 * Every run that is queued or going right now, with what the console needs to
 * draw how far along it is.
 *
 * No runner reports a percentage, so none is invented here. A stress run knows
 * its own plan (ramp up + hold + ramp down), so its length is exact. A unit or
 * E2E run does not, so its expected length is the MEDIAN of the last finished
 * runs of the same shape — the same unit workflow, the same E2E suite
 * selection. The median rather than the mean, so one run that hung for an
 * hour does not stretch every estimate after it. With no history the length
 * is null and the console draws a bar without a number.
 */

export type LiveRunKind = 'UNIT' | 'E2E' | 'STRESS';

export interface LiveRun {
  kind: LiveRunKind;
  run_id: string;
  run_no: string;
  status: string;
  /** The branch the run tests. */
  ref: string;
  stage: string | null;
  started_at: Date | null;
  expected_seconds: number | null;
  planned: boolean;
}

/** How many finished runs an estimate reads. */
const HISTORY = 10;

/** How many live runs of one kind are listed. More than this at once is a stuck queue, not progress. */
const LIVE_LIMIT = 10;

/**
 * A live row older than this is not live: its runner was cancelled or killed
 * with nothing left to report it (see the E2E model). Six hours is longer than
 * the slowest full sweep, and the unit sweep's own RUNNING timeout is four.
 */
const LIVE_WINDOW_MS = 6 * 60 * 60 * 1000;

/** The middle value, rounded to whole seconds; null for an empty list. */
export function median(values: readonly number[]): number | null {
  const sorted = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.round(value);
}

/** Exactly this suite selection. Empty means EVERY suite, the same convention the workflow uses. */
const sameSuites = (suites: readonly string[]) =>
  suites.length === 0 ? { $size: 0 } : { $size: suites.length, $all: [...suites] };

/**
 * A run that died before any test ran (a missing secret, an unreachable
 * server) finished in a minute and says nothing about how long a real sweep
 * takes, so a FAILED run only counts when it ran tests.
 */
async function e2eExpectedSeconds(suites: readonly string[]): Promise<number | null> {
  const rows = await E2eRunModel.find(
    {
      requested_suites: sameSuites(suites),
      duration_seconds: { $gt: 0 },
      $or: [{ status: 'SUCCESS' }, { status: 'FAILED', 'totals.tests': { $gt: 0 } }],
    },
    { duration_seconds: 1 }
  )
    .sort({ created_at: -1 })
    .limit(HISTORY)
    .lean();
  return median(rows.map((row) => row.duration_seconds ?? 0));
}

/** The unit runs of one workflow that reached a verdict. A cancelled run says nothing about length. */
async function unitExpectedSeconds(workflow: string): Promise<number | null> {
  const rows = await UnitTestRunModel.find(
    { workflow, status: { $in: ['PASSED', 'FAILED'] }, duration_ms: { $gt: 0 } },
    { duration_ms: 1 }
  )
    .sort({ finished_at: -1 })
    .limit(HISTORY)
    .lean();
  return median(rows.map((row) => (row.duration_ms ?? 0) / 1000));
}

/** One history read per shape, however many live runs share it. */
function memo(read: (key: string) => Promise<number | null>) {
  const seen = new Map<string, Promise<number | null>>();
  return (key: string) => {
    let pending = seen.get(key);
    if (!pending) {
      pending = read(key);
      seen.set(key, pending);
    }
    return pending;
  };
}

/** A suite selection as one key, the same whatever order it was asked in. */
const suiteKey = (suites: readonly string[]) => [...suites].sort((a, b) => a.localeCompare(b)).join(',');

async function liveE2e(since: Date): Promise<LiveRun[]> {
  const rows = await E2eRunModel.find(
    { status: { $in: ['QUEUED', 'RUNNING'] }, created_at: { $gte: since } },
    { run_no: 1, status: 1, ref: 1, stage: 1, stages: { $slice: 1 }, requested_suites: 1, created_at: 1 }
  )
    .sort({ created_at: -1 })
    .limit(LIVE_LIMIT)
    .lean();
  const expected = memo((key) => e2eExpectedSeconds(key ? key.split(',') : []));
  return Promise.all(
    rows.map(async (row) => ({
      kind: 'E2E' as const,
      run_id: String(row._id),
      run_no: row.run_no,
      status: row.status,
      ref: row.ref ?? '',
      stage: row.stage || null,
      // A RUNNING row stamps its first stage when the runner claims it.
      started_at: row.status === 'RUNNING' ? (row.stages?.[0]?.at ?? row.created_at) : null,
      expected_seconds: await expected(suiteKey(row.requested_suites ?? [])),
      planned: false,
    }))
  );
}

async function liveUnit(since: Date): Promise<LiveRun[]> {
  const rows = await UnitTestRunModel.find(
    { status: { $in: [...LIVE_UNIT_RUN_STATUSES] }, created_at: { $gte: since } },
    { run_no: 1, status: 1, workflow: 1, branch: 1, started_at: 1 }
  )
    .sort({ created_at: -1 })
    .limit(LIVE_LIMIT)
    .lean();
  const expected = memo(unitExpectedSeconds);
  return Promise.all(
    rows.map(async (row) => ({
      kind: 'UNIT' as const,
      run_id: String(row._id),
      run_no: row.run_no,
      status: row.status,
      ref: row.branch ?? '',
      stage: null,
      started_at: row.status === 'RUNNING' ? row.started_at : null,
      expected_seconds: await expected(row.workflow),
      planned: false,
    }))
  );
}

async function liveStress(since: Date): Promise<LiveRun[]> {
  const rows = await StressRunModel.find(
    { status: { $in: [...LIVE_STRESS_STATUSES] }, created_at: { $gte: since } },
    { run_no: 1, status: 1, ref: 1, started_at: 1, profile: 1 }
  )
    .sort({ created_at: -1 })
    .limit(LIVE_LIMIT)
    .lean();
  return rows.map((row) => {
    const { ramp_up_seconds = 0, hold_seconds = 0, ramp_down_seconds = 0 } = row.profile ?? {};
    const plan = ramp_up_seconds + hold_seconds + ramp_down_seconds;
    return {
      kind: 'STRESS' as const,
      run_id: String(row._id),
      run_no: row.run_no,
      status: row.status,
      ref: row.ref ?? '',
      stage: null,
      started_at: row.started_at,
      expected_seconds: plan > 0 ? plan : null,
      planned: true,
    };
  });
}

export async function liveTestRuns(now: Date = new Date()) {
  const since = new Date(now.getTime() - LIVE_WINDOW_MS);
  const [unit, e2e, stress] = await Promise.all([liveUnit(since), liveE2e(since), liveStress(since)]);
  return { runs: [...e2e, ...unit, ...stress], server_now: now };
}
