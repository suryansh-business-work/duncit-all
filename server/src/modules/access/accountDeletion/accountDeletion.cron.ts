import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { isDue } from '@utils/cron-schedule';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  AccountDeletionRequestModel,
  AccountDeletionRunModel,
  AccountDeletionSettingsModel,
  type DeletionRunTrigger,
  type IAccountDeletionRun,
} from './accountDeletion.model';
import { accountDeletionService, cronScheduleOf, readSettings } from './accountDeletion.service';

/**
 * The job that carries out deletion requests once their grace period is up.
 *
 * Until this existed the queue was cleared by hand, which is fine while it is
 * short and quietly becomes a data-retention problem when it is not: a member
 * who was promised removal in thirty days is only actually removed when
 * somebody remembers. The sweep makes the promise the product's rather than an
 * operator's.
 *
 * THREE THINGS IT HAS TO GET RIGHT, and each one is a separate mechanism below:
 *
 *  - It must only touch what is due. Eligibility is `status: PENDING` AND a
 *    stamped `scheduled_delete_at` that has passed — never a day count worked
 *    out here, because the date on the request is the one the member was told.
 *  - It must be safe to run twice. Two ticks, two processes, or an operator
 *    pressing Run now while the timer fires all have to add up to one purge per
 *    account: `claimRun` makes the schedule fire once, and each request is
 *    claimed out of PENDING before a byte of it is deleted.
 *  - It must leave a record. Every sweep writes a run row — including the ones
 *    that found nobody, because a night with no row at all is the thing an
 *    operator needs to be able to notice.
 */

/** `DUN-ADX-4F2A19` — the run's own reference, beside DUN-ADR for a request. */
function nextRunId(): string {
  return `DUN-ADX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/**
 * A sweep is already in flight in this process.
 *
 * Belt to `claimRun`'s braces, and it catches the one thing the claim cannot:
 * an operator pressing Run now twice, which is not gated on the schedule at
 * all. A purge holds a transaction across every collection an account appears
 * in, so two at once is worth refusing rather than serialising.
 */
let inFlight = false;

const RUN_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['run_id', 'error'],
  sortFields: {
    run_id: 'run_id',
    trigger: 'trigger',
    status: 'status',
    eligible: 'eligible',
    purged: 'purged',
    failed: 'failed',
    started_at: 'started_at',
    finished_at: 'finished_at',
  },
  filterFields: {
    status: { type: 'enum' },
    trigger: { type: 'enum' },
    started_at: { type: 'date' },
  },
  // Most recent first: the question asked of this table is "did last night run".
  defaultSort: { started_at: -1 },
};

function toPublicRun(doc: IAccountDeletionRun | null) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    run_id: doc.run_id,
    trigger: doc.trigger,
    status: doc.status,
    cutoff_at: doc.cutoff_at.toISOString(),
    retention_days: doc.retention_days,
    eligible: doc.eligible,
    purged: doc.purged,
    failed: doc.failed,
    error: doc.error,
    started_at: doc.started_at.toISOString(),
    finished_at: doc.finished_at ? doc.finished_at.toISOString() : null,
    results: doc.results.map((row) => ({
      request_id: row.request_id,
      user_id: String(row.user_id),
      email: row.snapshot_email,
      outcome: row.outcome,
      records: row.records,
      error: row.error,
    })),
  };
}

/**
 * Claim the due window, atomically. True means THIS caller owns the run.
 *
 * The whole idempotency of the schedule is this one conditional write. The
 * filter says "only if last_run_at is still what I read", so of two ticks that
 * both saw the same window owed, exactly one update matches and the other
 * modifies nothing and stands down. It works across processes as well as across
 * timers, because the decision is made by the database rather than by either
 * caller's memory of it.
 *
 * The stamp moves whether the sweep then succeeds or fails: a purge that cannot
 * reach the database will not reach it a minute later either, and retrying on
 * every tick would fill the run table with the same failure instead of leaving
 * the one worth reading.
 */
async function claimRun(previous: Date | null, now: Date): Promise<boolean> {
  const result = await AccountDeletionSettingsModel.updateOne(
    { last_run_at: previous },
    { $set: { last_run_at: now } }
  );
  return result.modifiedCount === 1;
}

/**
 * Take one request out of PENDING before anything is deleted for it.
 *
 * `purgeAll` already refuses a request that is not PENDING, but it re-reads the
 * document to find that out — so two callers can both read PENDING and both
 * proceed. This closes that window at the database: the status moves to
 * PROCESSING in a single conditional update, and only the caller whose update
 * matched goes on to delete anything.
 *
 * The claim is its OWN field rather than a new status value, so a sweep killed
 * mid-flight leaves the request exactly where the console expects it — still
 * PENDING, still counted, and safe to retry once the field is cleared.
 */
async function claimRequest(requestDocId: string, now: Date): Promise<boolean> {
  const result = await AccountDeletionRequestModel.updateOne(
    { _id: requestDocId, status: 'PENDING', purge_started_at: null },
    { $set: { purge_started_at: now } }
  );
  return result.modifiedCount === 1;
}

/** Undo a claim whose purge never happened, so the next sweep can retry it. */
async function releaseRequest(requestDocId: string): Promise<void> {
  await AccountDeletionRequestModel.updateOne(
    { _id: requestDocId, status: 'PENDING' },
    { $set: { purge_started_at: null } }
  );
}

/** A failure as a line in the audit row. Capped: this is a record, not a log. */
function describe(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}

/** Rows removed or redacted across every collection, for scale not detail. */
function recordsIn(detail: {
  request: { purge_log: { removed: number }[] } | null;
}): number {
  const log = detail.request?.purge_log ?? [];
  return log.reduce((sum, entry) => sum + entry.removed, 0);
}

/**
 * The requests this sweep may act on: open, and past the date on them.
 *
 * Ordered by that date so the queue drains oldest-first — with a batch ceiling,
 * which order the rows come back in is the difference between a backlog that
 * clears and one row that never gets its turn.
 */
async function eligibleRequests(cutoff: Date, limit: number) {
  return AccountDeletionRequestModel.find({
    status: 'PENDING',
    scheduled_delete_at: { $lte: cutoff },
  })
    .sort({ scheduled_delete_at: 1 })
    .limit(limit)
    .select('_id request_id user_id snapshot_email')
    .lean();
}

/**
 * Carry out every due request, up to the batch ceiling, and record what happened.
 *
 * One account's failure never stops the sweep: the run row names it, the
 * request stays open, and the next sweep tries it again. A run that abandoned
 * the remaining accounts because one of them had a bad row would turn a single
 * stuck member into a retention breach for everybody behind them.
 */
async function executeRun(trigger: DeletionRunTrigger, startedBy: string | null, now: Date) {
  const settings = await accountDeletionService.adminSettings();
  const due = await eligibleRequests(now, settings.cron_batch_size);
  const run = await AccountDeletionRunModel.create({
    run_id: nextRunId(),
    trigger,
    status: 'RUNNING',
    cutoff_at: now,
    retention_days: settings.retention_days,
    eligible: due.length,
    started_by: startedBy,
    started_at: now,
  });

  let purged = 0;
  let failed = 0;
  try {
    for (const row of due) {
      const requestDocId = String(row._id);
      // Somebody else got there first — the console, or a sweep in another
      // process. Not a failure, and not this run's to report.
      if (!(await claimRequest(requestDocId, new Date()))) continue;
      try {
        const detail = await accountDeletionService.purgeAll(requestDocId, startedBy);
        purged += 1;
        run.results.push({
          request_id: row.request_id,
          user_id: row.user_id,
          snapshot_email: row.snapshot_email ?? '',
          outcome: 'PURGED',
          records: recordsIn(detail),
          error: '',
        });
      } catch (error) {
        failed += 1;
        await releaseRequest(requestDocId);
        run.results.push({
          request_id: row.request_id,
          user_id: row.user_id,
          snapshot_email: row.snapshot_email ?? '',
          outcome: 'FAILED',
          records: 0,
          error: describe(error),
        });
        logs.server.error('account-deletion', 'cron-purge', {
          error,
          request_id: row.request_id,
        });
      }
    }
    // SUCCEEDED even with failures in it. An account that could not be purged
    // is a line in a run that otherwise did its job, and colouring the whole
    // night red for one bad row would make the status useless as an alarm —
    // which is what `failed` and the per-account results are for.
    run.status = 'SUCCEEDED';
  } catch (error) {
    // The sweep ITSELF fell over — the database went away mid-loop, say. The
    // accounts already purged stay purged and are still named in the results;
    // what this records is that the rest never got their turn, so the row does
    // not sit at RUNNING forever looking like a job that is still going.
    run.status = 'FAILED';
    run.error = describe(error);
    logs.server.error('account-deletion', 'cron-run', { error, run_id: run.run_id });
  }

  run.purged = purged;
  run.failed = failed;
  run.finished_at = new Date();
  await run.save();
  return toPublicRun(run);
}

export const accountDeletionCron = {
  /**
   * The scheduler's whole decision, so the timer beside it stays a timer.
   * Returns the run, or null when nothing was owed.
   */
  async runIfDue(now: Date = new Date()) {
    // Upserting read: the very first tick on a fresh install must not be the
    // thing that discovers there is no schedule document to read.
    const doc = await readSettings();
    if (!isDue(cronScheduleOf(doc), doc.last_run_at, now)) return null;
    if (inFlight) return null;
    if (!(await claimRun(doc.last_run_at ?? null, now))) return null;
    inFlight = true;
    try {
      return await executeRun('SCHEDULED', null, now);
    } finally {
      inFlight = false;
    }
  },

  /**
   * Run it now, from the Admin Panel.
   *
   * Deliberately NOT gated on `cron_enabled` and does not move `last_run_at`:
   * this is a human asking for the queue to be cleared, and it must neither
   * require switching the schedule on nor make tonight's sweep look like it
   * already happened.
   */
  async runNow(actorId: string) {
    if (inFlight) {
      throw new GraphQLError('A deletion sweep is already running', {
        extensions: { code: 'CONFLICT' },
      });
    }
    inFlight = true;
    try {
      return await executeRun('MANUAL', actorId, new Date());
    } finally {
      inFlight = false;
    }
  },

  /** How many requests would be carried out right now. The console's preview. */
  async dueCount(now: Date = new Date()): Promise<number> {
    return AccountDeletionRequestModel.countDocuments({
      status: 'PENDING',
      scheduled_delete_at: { $lte: now },
    });
  },

  /** The audit log: every sweep, newest first. */
  async runsTable(input: TableQueryInput | null | undefined) {
    const { docs, total, page, page_size } = await runTableQuery<IAccountDeletionRun>(
      AccountDeletionRunModel,
      {},
      input,
      RUN_TABLE_CONFIG
    );
    return { rows: docs.map(toPublicRun), total, page, page_size };
  },
};
