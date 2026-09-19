import type { TableScope } from '@utils/table-query';
import { bulkDeleteOperations, captureScope, runAs } from './bulkDelete.operations';
import { BackgroundJobModel, type BulkDeleteMode, type JobRowFailure, type LeanBackgroundJob } from './backgroundJob.model';

/**
 * One bulk-delete step for the background runner (backgroundJob.runner).
 *
 * Each batch re-reads the table's scope, takes the next rows after `cursor`,
 * deletes them one by one through the table's own mutation, then writes the
 * counts and the new cursor.
 */

const BATCH_SIZE = 25;
const FAILURES_KEPT = 20;

interface ScopeWindow {
  mode: BulkDeleteMode | null;
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

/** Delete the next batch. False when nothing in scope is left. */
export async function deleteBatch(job: LeanBackgroundJob): Promise<boolean> {
  const ops = bulkDeleteOperations(job.table);
  if (!ops) throw new Error('This table no longer supports bulk delete.');
  const scope = await captureScope(ops, job.variables, job.actor, job.identity);
  const rows: Array<{ _id: unknown }> = await findInScope(scope, scopeFilter(scope, job))
    .sort({ _id: 1 })
    .limit(BATCH_SIZE)
    .select('_id')
    .lean();
  const last = rows.at(-1);
  if (!last) return false;
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
      $set: { cursor: last._id },
      $push: { failures: { $each: failures, $slice: FAILURES_KEPT } },
    }
  );
  return true;
}
