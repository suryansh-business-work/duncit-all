import type { TestsLiveRun } from '@duncit/gql-types';

/**
 * The bar never reads 100 while the run is still going: "done" is the run's
 * word, not the clock's. A run past its expected length holds here.
 */
const CEILING = 99;

export interface RunProgress {
  /** 0-99 while a runner works on it; null when there is nothing to measure against. */
  percent: number | null;
  /** Whole seconds until the expected end; null without an estimate, or once past it. */
  remainingSeconds: number | null;
  /** Whole seconds since a runner picked it up; null while it is queued. */
  elapsedSeconds: number | null;
  /** Past its expected length and still going. */
  overdue: boolean;
}

const NOT_STARTED: RunProgress = { percent: null, remainingSeconds: null, elapsedSeconds: null, overdue: false };

/**
 * How far along a live run probably is, measured on the SERVER's clock (`nowMs`
 * already carries the offset), against how long a run like it usually takes.
 * Only a RUNNING run is measured: a queued one has not started, and a stopping
 * stress run is winding down rather than moving forward.
 */
export function runProgress(
  run: Pick<TestsLiveRun, 'status' | 'started_at' | 'expected_seconds'>,
  nowMs: number
): RunProgress {
  if (run.status !== 'RUNNING' || !run.started_at) return NOT_STARTED;
  const elapsed = Math.max(0, (nowMs - Date.parse(run.started_at)) / 1000);
  const elapsedSeconds = Math.floor(elapsed);
  const expected = run.expected_seconds ?? 0;
  if (expected <= 0) return { ...NOT_STARTED, elapsedSeconds };
  const overdue = elapsed > expected;
  return {
    percent: Math.min(CEILING, Math.floor((elapsed / expected) * 100)),
    remainingSeconds: overdue ? null : Math.ceil(expected - elapsed),
    elapsedSeconds,
    overdue,
  };
}

/** Whole minutes, rounded up, so "1 min left" never shows while two are left. */
export const minutesOf = (seconds: number) => Math.max(1, Math.ceil(seconds / 60));
