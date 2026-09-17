import type { BackgroundJob } from './queries';

export const isRunning = (job: BackgroundJob): boolean => job.status === 'RUNNING';

/** Rows the job has dealt with so far, deleted or refused. */
const processed = (job: BackgroundJob): number => Math.min(job.total, job.succeeded + job.failed);

/**
 * How far one job has got, 0–100.
 *
 * A completed job reads 100 even when its counts fall short: a row someone else
 * deleted first, or a batch a restart interrupted, is not left to do.
 */
export function jobPercent(job: BackgroundJob): number {
  if (job.status === 'COMPLETED') return 100;
  if (job.total <= 0) return 0;
  return Math.round((processed(job) / job.total) * 100);
}

/**
 * The header's one number: rows done across every running job over rows in
 * scope across them — so a 10-row job finishing does not claim half of a
 * 10,000-row one.
 */
export function overallPercent(jobs: readonly BackgroundJob[]): number {
  const running = jobs.filter(isRunning);
  const total = running.reduce((sum, job) => sum + job.total, 0);
  if (total <= 0) return 0;
  const done = running.reduce((sum, job) => sum + processed(job), 0);
  return Math.round((done / total) * 100);
}
