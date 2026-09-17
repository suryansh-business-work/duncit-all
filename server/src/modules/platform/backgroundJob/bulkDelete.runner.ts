import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { logs } from '@observability/log';
import type { TableScope } from '@utils/table-query';
import { bulkDeleteOperations, captureScope, runAs } from './bulkDelete.operations';
import {
  BackgroundJobModel,
  type BackgroundJobStatus,
  type BulkDeleteMode,
  type JobRowFailure,
  type LeanBackgroundJob,
} from './backgroundJob.model';

/**
 * Works a bulk delete off in small batches, one after another.
 *
 * Each batch re-reads the table's scope, takes the next rows after `cursor`,
 * deletes them one by one through the table's own mutation, then writes the
 * counts and the new cursor before scheduling the next batch with
 * `setImmediate` — so a delete of thousands of rows never holds the event loop
 * and a restart loses at most the batch in hand.
 *
 * A lease keeps two server processes (a deploy's old and new containers) from
 * working one job at once. A process that finds the lease taken waits it out
 * and tries again, which is how a job survives the process that held it dying.
 */

const BATCH_SIZE = 25;
/** Long enough for a batch with heavy cascades; how long a takeover waits. */
const LEASE_MS = 2 * 60_000;
const FAILURES_KEPT = 20;
const OWNER = `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;

const scheduled = new Set<string>();

type StepResult = 'MORE' | 'WAIT' | 'DONE';

interface ScopeWindow {
  mode: BulkDeleteMode;
  ids: readonly string[];
  cursor: unknown;
  max_id: unknown;
}

/** The job's rows: the table's scope, narrowed to the ticks and the id window. */
export function scopeFilter(scope: TableScope, window: ScopeWindow): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [scope.filter];
  if (window.mode === 'SELECTED') clauses.push({ _id: { $in: window.ids } });
  const range: Record<string, unknown> = {};
  if (window.cursor != null) range.$gt = window.cursor;
  if (window.max_id != null) range.$lte = window.max_id;
  if (Object.keys(range).length > 0) clauses.push({ _id: range });
  return { $and: clauses };
}

/** A find over the scope that honours the table's soft-delete opt-in. */
export function findInScope(scope: TableScope, filter: Record<string, unknown>) {
  const query = scope.model.find(filter);
  if (scope.includeDeleted) query.setOptions({ includeDeleted: true });
  return query;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function claim(id: string): Promise<LeanBackgroundJob | null> {
  const now = new Date();
  return BackgroundJobModel.findOneAndUpdate(
    {
      _id: id,
      status: 'RUNNING',
      $or: [{ lease_owner: OWNER }, { lease_until: null }, { lease_until: { $lt: now } }],
    },
    { $set: { lease_owner: OWNER, lease_until: new Date(now.getTime() + LEASE_MS) } },
    { new: true }
  ).lean<LeanBackgroundJob>();
}

async function finish(id: string, status: BackgroundJobStatus, message: string): Promise<void> {
  await BackgroundJobModel.updateOne(
    { _id: id, status: 'RUNNING' },
    { $set: { status, error_message: message, finished_at: new Date(), lease_until: null } }
  );
}

/** Delete the next batch. False when nothing in scope is left. */
async function deleteBatch(job: LeanBackgroundJob): Promise<boolean> {
  const ops = bulkDeleteOperations(job.table);
  if (!ops) throw new Error('This table no longer supports bulk delete.');
  const scope = await captureScope(ops, job.variables, job.actor, job.identity);
  const rows: Array<{ _id: unknown }> = await findInScope(scope, scopeFilter(scope, job))
    .sort({ _id: 1 })
    .limit(BATCH_SIZE)
    .select('_id')
    .lean();
  if (rows.length === 0) return false;
  let succeeded = 0;
  const failures: JobRowFailure[] = [];
  for (const row of rows) {
    const rowId = String(row._id);
    try {
      await runAs(ops.remove, { [ops.idArg]: rowId }, job.actor, job.identity);
      succeeded += 1;
    } catch (error) {
      failures.push({ id: rowId, message: messageOf(error) });
    }
  }
  // Counted whatever the status is now: a cancel that landed mid-batch does
  // not undo the rows this batch already deleted.
  await BackgroundJobModel.updateOne(
    { _id: job._id },
    {
      $inc: { succeeded, failed: failures.length },
      $set: { cursor: rows.at(-1)?._id },
      $push: { failures: { $each: failures, $slice: FAILURES_KEPT } },
    }
  );
  return true;
}

async function step(id: string): Promise<StepResult> {
  const job = await claim(id);
  if (!job) {
    const running = await BackgroundJobModel.exists({ _id: id, status: 'RUNNING' });
    return running ? 'WAIT' : 'DONE';
  }
  try {
    if (await deleteBatch(job)) return 'MORE';
    await finish(id, 'COMPLETED', '');
  } catch (error) {
    logs.server.error('backgroundJob', 'step', { error, job_id: id, table: job.table });
    await finish(id, 'FAILED', messageOf(error));
  }
  return 'DONE';
}

function loop(id: string): void {
  step(id)
    .then((result) => {
      if (result === 'MORE') globalThis.setImmediate(() => loop(id));
      else if (result === 'WAIT') globalThis.setTimeout(() => loop(id), LEASE_MS);
      else scheduled.delete(id);
    })
    .catch((error: unknown) => {
      scheduled.delete(id);
      logs.server.error('backgroundJob', 'loop', { error, job_id: id });
    });
}

/** Start working a job in this process, unless it already is. */
export function scheduleJob(id: string): void {
  if (scheduled.has(id)) return;
  scheduled.add(id);
  globalThis.setImmediate(() => loop(id));
}

/** Pick up every job a previous process left RUNNING. Called once at boot. */
export async function resumeBackgroundJobs(): Promise<void> {
  const ids: unknown[] = await BackgroundJobModel.find({ status: 'RUNNING' }).distinct('_id');
  for (const id of ids) scheduleJob(String(id));
}
