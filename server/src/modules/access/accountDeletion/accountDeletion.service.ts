import { Types, type ClientSession } from 'mongoose';
import { GraphQLError } from 'graphql';
import crypto from 'node:crypto';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { withTransaction } from '@utils/mongoTransaction';
import { UserModel } from '@modules/access/user/user.model';
import { userService } from '@modules/access/user/user.service';
import { nextRunAt, parseTimeOfDay, type CronSchedule } from '@utils/cron-schedule';
import { emitSessionRevoked } from '../../../realtime/user.events';
import {
  AccountDeletionRequestModel,
  AccountDeletionSettingsModel,
  DEFAULT_DELETION_RETENTION_DAYS,
  DELETION_CRON_FREQUENCIES,
  type DeletionCronFrequency,
  type DeletionRequestSurface,
  type IAccountDeletionRequest,
  type IAccountDeletionSettings,
} from './accountDeletion.model';
import { lockAccount, unlockAccount } from './accountDeletion.lock';
import { userTrace } from './accountDeletion.trace';
import { purgeKind, purgeReference } from './accountDeletion.purge';
import { retentionReason } from './accountDeletion.retention';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['request_id', 'snapshot_name', 'snapshot_email', 'snapshot_phone', 'reason'],
  sortFields: {
    request_id: 'request_id',
    snapshot_name: 'snapshot_name',
    snapshot_email: 'snapshot_email',
    status: 'status',
    surface: 'surface',
    requested_at: 'requested_at',
    // What the queue is actually ordered by once a window exists: whoever runs
    // out first. Sorting by the date IS sorting by the time left, because every
    // row counts down against the same clock.
    scheduled_delete_at: 'scheduled_delete_at',
    reviewed_at: 'reviewed_at',
  },
  filterFields: {
    status: { type: 'enum' },
    surface: { type: 'enum' },
    requested_at: { type: 'date' },
    snapshot_email: { type: 'string' },
  },
  // Oldest open request first: the queue is a waiting line, not a news feed.
  defaultSort: { requested_at: 1 },
};

/** `DUN-ADR-4F2A19` — the id shape the rest of the product already uses. */
function nextRequestId(): string {
  return `DUN-ADR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function requireObjectId(value: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new GraphQLError(`Invalid ${label}`, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return new Types.ObjectId(value);
}

/**
 * Whole days left before the promised date, floored, never below zero.
 *
 * Floored rather than rounded: "1 day left" has to stop meaning "some time in
 * the next 36 hours". A row already past its date reports 0 and the console
 * shows it as due — it is a queue that has been waited on, not a countdown
 * that runs negative.
 */
function daysRemaining(scheduled: Date | null | undefined, status: string): number | null {
  // A closed request is a record. It has no date left to run down, and a
  // countdown on a cancelled row would read as still scheduled.
  if (!scheduled || status !== 'PENDING') return null;
  const ms = scheduled.getTime() - Date.now();
  return ms <= 0 ? 0 : Math.floor(ms / MS_PER_DAY);
}

/** The GraphQL shape. `user_id` stays a string so the console can still link
 * out to a member whose account has not been removed yet. */
function toPublic(doc: IAccountDeletionRequest | null) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    request_id: doc.request_id,
    user_id: String(doc.user_id),
    name: doc.snapshot_name,
    email: doc.snapshot_email,
    phone: doc.snapshot_phone,
    reason: doc.reason,
    surface: doc.surface,
    status: doc.status,
    requested_at: doc.requested_at.toISOString(),
    // Legacy read. Requests filed before the window existed carry no date; the
    // boot backfill stamps them, and until it has run they read as due now
    // rather than breaking the queue on a missing non-null field.
    scheduled_delete_at: (doc.scheduled_delete_at ?? doc.requested_at).toISOString(),
    days_remaining: daysRemaining(doc.scheduled_delete_at, doc.status),
    reviewed_at: doc.reviewed_at ? doc.reviewed_at.toISOString() : null,
    reviewed_by: doc.reviewed_by ? String(doc.reviewed_by) : null,
    note: doc.note,
    purge_log: doc.purge_log.map((entry) => ({
      model_name: entry.model_name,
      collection_name: entry.collection_name,
      field_path: entry.field_path,
      removed: entry.removed,
      purged_at: entry.purged_at.toISOString(),
    })),
  };
}

async function findRequest(requestDocId: string): Promise<IAccountDeletionRequest> {
  const doc = await AccountDeletionRequestModel.findById(requireObjectId(requestDocId, 'request'));
  if (!doc) {
    throw new GraphQLError('Deletion request not found', { extensions: { code: 'NOT_FOUND' } });
  }
  return doc;
}

/** A request already carried out or called off cannot be acted on again — the
 * rows it named are gone, and the account it named may be too. */
function assertActionable(doc: IAccountDeletionRequest) {
  if (doc.status !== 'PENDING') {
    throw new GraphQLError(`This request is already ${doc.status.toLowerCase()}`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

/**
 * The retention window, read as one document.
 *
 * `upsert` rather than a read that may find nothing: the very first request on
 * a fresh install must not be the thing that discovers there is no setting to
 * stamp a date from.
 */
export async function readSettings(session?: ClientSession) {
  const doc = await AccountDeletionSettingsModel.findOneAndUpdate(
    {},
    { $setOnInsert: { retention_days: DEFAULT_DELETION_RETENTION_DAYS } },
    { new: true, upsert: true, session }
  );
  return doc;
}

/** `requested_at + retention_days`, which is the date the member is told. */
function scheduledDeleteAt(requestedAt: Date, retentionDays: number): Date {
  return new Date(requestedAt.getTime() + retentionDays * MS_PER_DAY);
}

export interface CronSettingsInput {
  cron_enabled?: boolean | null;
  cron_frequency?: string | null;
  cron_time_of_day?: string | null;
  cron_weekday?: number | null;
  cron_batch_size?: number | null;
}

interface CronFieldRule {
  valid: (value: unknown) => boolean;
  message: string;
  clean?: (value: unknown) => unknown;
}

const isWholeInRange = (value: unknown, min: number, max: number): boolean =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

/**
 * What each schedule field will accept, as data rather than a wall of ifs.
 *
 * Every one of these is REJECTED rather than defaulted when it does not fit,
 * and that is the point of validating at all: a time the scheduler cannot
 * parse makes `isDue` answer false forever, so a bad save would produce a
 * sweep that silently never runs — the exact failure nobody notices until a
 * member who was promised deletion is still in the database months later.
 */
const CRON_FIELD_RULES: ReadonlyArray<[keyof CronSettingsInput, CronFieldRule]> = [
  [
    'cron_enabled',
    { valid: (value) => typeof value === 'boolean', message: 'Enabled must be true or false' },
  ],
  [
    'cron_frequency',
    {
      valid: (value) => DELETION_CRON_FREQUENCIES.includes(value as DeletionCronFrequency),
      message: 'Frequency must be DAILY or WEEKLY',
    },
  ],
  [
    'cron_time_of_day',
    {
      valid: (value) => typeof value === 'string' && !!parseTimeOfDay(value),
      message: 'Time must be HH:mm, e.g. 03:00',
      clean: (value) => String(value).trim(),
    },
  ],
  [
    'cron_weekday',
    {
      valid: (value) => isWholeInRange(value, 0, 6),
      message: 'Weekday must be 0 (Sunday) to 6 (Saturday)',
    },
  ],
  [
    'cron_batch_size',
    {
      valid: (value) => isWholeInRange(value, 1, 500),
      message: 'Batch size must be a whole number between 1 and 500',
    },
  ],
];

/** The settings document as the shared scheduler reads a schedule. */
export function cronScheduleOf(doc: IAccountDeletionSettings): CronSchedule {
  return {
    enabled: doc.cron_enabled,
    frequency: doc.cron_frequency,
    time_of_day: doc.cron_time_of_day,
    weekday: doc.cron_weekday,
  };
}

/** The whole settings card, in one shape both the query and the mutation answer. */
function toSettings(doc: IAccountDeletionSettings) {
  const next = nextRunAt(cronScheduleOf(doc), new Date());
  return {
    retention_days: doc.retention_days,
    cron_enabled: doc.cron_enabled,
    cron_frequency: doc.cron_frequency,
    cron_time_of_day: doc.cron_time_of_day,
    cron_weekday: doc.cron_weekday,
    cron_batch_size: doc.cron_batch_size,
    last_run_at: doc.last_run_at ? doc.last_run_at.toISOString() : null,
    // Null while the sweep is off, which is what the console renders as "Off"
    // rather than inventing a date nothing will fire on.
    next_run_at: next ? next.toISOString() : null,
  };
}

/**
 * Close an account: refuse its tokens, then tell its live surfaces to leave.
 *
 * The order is not cosmetic. Sealing first means the socket frame lands on
 * clients whose next request would already have been refused, so a device that
 * misses the frame is no worse off than one that never had a socket — it signs
 * out on its next call. Emitting first would leave a window where a client
 * reacted, retried, and was let back in.
 */
function sealAccount(userId: string, at: Date): void {
  lockAccount(userId, at);
  emitSessionRevoked(userId, 'ACCOUNT_DELETION_REQUESTED');
}

/**
 * Reopen an account: its tokens are accepted again and it can sign in.
 *
 * Called when the request is withdrawn or turned down — and after a purge,
 * where it is only housekeeping, since the account it names no longer exists.
 * The tokens minted before the seal start working again, which is the honest
 * behaviour for a decision that was reversed: nothing about the credentials
 * changed, only whether the account was leaving.
 */
function releaseAccount(userId: string): void {
  unlockAccount(userId);
}

/** One line of the purge log: what was cleared, how much of it, by whom. */
function logEntry(
  group: { model_name: string; collection_name: string; field_path: string },
  removed: number,
  actor: Types.ObjectId | null
) {
  return {
    model_name: group.model_name,
    collection_name: group.collection_name,
    field_path: group.field_path,
    removed,
    purged_at: new Date(),
    purged_by: actor,
  };
}

export const accountDeletionService = {
  /** The window, for the Tech settings card and for the warning both apps show
   * before anybody confirms. */
  async settings() {
    const doc = await readSettings();
    return { retention_days: doc.retention_days };
  },

  /**
   * The window AND the schedule, for the Admin Panel's settings card.
   *
   * Kept apart from `settings()` above deliberately: that one answers any
   * signed-in member, because both apps quote the number before anybody
   * confirms. When the job runs, how big a batch it takes and when it last
   * fired are operational facts a member has no business reading.
   */
  async adminSettings() {
    return toSettings(await readSettings());
  },

  /** Change the window. Applies to requests filed AFTER it — a member already
   * waiting keeps the date they were promised. */
  async updateSettings(retention_days: number, actor_id: string) {
    if (!Number.isInteger(retention_days) || retention_days < 1 || retention_days > 365) {
      throw new GraphQLError('Retention must be a whole number of days between 1 and 365', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const doc = await AccountDeletionSettingsModel.findOneAndUpdate(
      {},
      { $set: { retention_days, updated_by: requireObjectId(actor_id, 'actor') } },
      { new: true, upsert: true }
    );
    return { retention_days: doc.retention_days };
  },

  /**
   * Change WHEN the sweep runs — and whether it runs at all.
   *
   * Separate from the window above because the two are different promises. The
   * window is what a member was told and cannot be moved under them; the
   * schedule is an operational knob, and turning it off simply hands the queue
   * back to the humans who cleared it before this existed.
   *
   * `last_run_at` is deliberately NOT reset here. Editing the time must not
   * make a sweep that already ran today look owed again — that is the one way
   * a settings save could turn into an unplanned purge.
   */
  async updateCronSettings(input: CronSettingsInput, actor_id: string) {
    const set: Record<string, unknown> = { updated_by: requireObjectId(actor_id, 'actor') };
    for (const [field, rule] of CRON_FIELD_RULES) {
      const value = input[field];
      if (value === undefined || value === null) continue;
      if (!rule.valid(value)) {
        throw new GraphQLError(rule.message, { extensions: { code: 'BAD_USER_INPUT' } });
      }
      set[field] = rule.clean ? rule.clean(value) : value;
    }
    const doc = await AccountDeletionSettingsModel.findOneAndUpdate(
      {},
      { $set: set },
      { new: true, upsert: true }
    );
    return toSettings(doc);
  },

  /**
   * Stamp a date on every open request that predates the window.
   *
   * Runs once at boot. Without it those rows have no date to count down from,
   * and the queue would show a blank where the member's promise should be.
   */
  async backfillScheduledDates() {
    const { retention_days } = await accountDeletionService.settings();
    const open = await AccountDeletionRequestModel.find({
      status: 'PENDING',
      scheduled_delete_at: null,
    });
    for (const doc of open) {
      doc.scheduled_delete_at = scheduledDeleteAt(doc.requested_at, retention_days);
      await doc.save();
    }
    return open.length;
  },

  /**
   * File a request. Confirmed with the same emailed code the instant deletion
   * used to consume: the proof required has not changed, only what happens
   * once it checks out.
   *
   * The code checking out ENDS the session, everywhere, and closes the account
   * to further sign-ins for as long as the request stands. That is the whole
   * difference between this and a preference: from here on the account is
   * leaving, and the grace period is time for the decision to be reversed by
   * somebody with the console — not time to go on using it.
   */
  async submitRequest(
    user_id: string,
    input: { otp: string; reason?: string | null; surface?: DeletionRequestSurface | null }
  ) {
    const user = await userService.consumeAccountDeletionOtp(user_id, input.otp);
    // Asking twice is not an error — it is somebody who did not see the first
    // one land. Hand back the request they already have (and re-seal, in case
    // this process came up after the request was filed).
    const existing = await AccountDeletionRequestModel.findOne({
      user_id: user._id,
      status: 'PENDING',
    });
    if (existing) {
      sealAccount(String(user._id), existing.requested_at);
      return toPublic(existing);
    }

    const phone = user.auth?.phone;
    const { retention_days } = await accountDeletionService.settings();
    const requestedAt = new Date();
    const doc = await AccountDeletionRequestModel.create({
      request_id: nextRequestId(),
      user_id: user._id,
      snapshot_name: [user.profile?.first_name, user.profile?.last_name]
        .filter(Boolean)
        .join(' ')
        .trim(),
      snapshot_email: user.auth?.email ?? '',
      snapshot_phone: phone?.number ? `${phone.extension ?? ''}${phone.number}` : '',
      reason: (input.reason ?? '').trim(),
      surface: input.surface ?? 'UNKNOWN',
      status: 'PENDING',
      requested_at: requestedAt,
      scheduled_delete_at: scheduledDeleteAt(requestedAt, retention_days),
    });
    // AFTER the row exists, never before: a seal without a request behind it
    // would survive a failed create as an account nobody can sign in to and
    // no queue entry explains.
    sealAccount(String(user._id), requestedAt);
    return toPublic(doc);
  },

  /** The member's own open request, or null — what the apps read to show the
   * "deletion requested" banner in place of the delete button. */
  async myRequest(user_id: string) {
    const doc = await AccountDeletionRequestModel.findOne({
      user_id: requireObjectId(user_id, 'user'),
      status: 'PENDING',
    });
    return toPublic(doc);
  },

  /**
   * Withdraw it. Only their own, and only while it is still open.
   *
   * NOT reachable from the apps any more: filing a request seals the account,
   * so nobody holding an open request can be signed in to call this. It is kept
   * because the account IS reopened by the same code path when an admin turns a
   * request down, and because a request filed before the seal existed may still
   * be in the queue with a live session behind it.
   */
  async cancelMyRequest(user_id: string) {
    const doc = await AccountDeletionRequestModel.findOne({
      user_id: requireObjectId(user_id, 'user'),
      status: 'PENDING',
    });
    if (!doc) {
      throw new GraphQLError('You have no open deletion request', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    doc.status = 'CANCELLED';
    doc.reviewed_at = new Date();
    await doc.save();
    releaseAccount(String(doc.user_id));
    return toPublic(doc);
  },

  async table(input: TableQueryInput | null | undefined) {
    const { docs, total, page, page_size } = await runTableQuery<IAccountDeletionRequest>(
      AccountDeletionRequestModel,
      {},
      input,
      TABLE_CONFIG
    );
    return { rows: docs.map(toPublic), total, page, page_size };
  },

  /** One request, plus where that member still appears — counted live, so the
   * console never offers to delete something already gone. */
  async detail(request_doc_id: string) {
    const doc = await findRequest(request_doc_id);
    const trace = await userTrace(String(doc.user_id));
    const account = await UserModel.exists({ _id: doc.user_id });
    return {
      request: toPublic(doc),
      account_exists: !!account,
      trace: trace.map((group) => ({
        model_name: group.model_name,
        collection_name: group.collection_name,
        field_path: group.field_path,
        id_kind: group.id_kind,
        count: group.count,
        // Whether clearing this removes the documents, pulls the member out of
        // somebody else's, or redacts a record that has to survive them. The
        // console says which before it asks.
        purge_kind: purgeKind(group.model_name, group.field_path),
        retention_reason: retentionReason(group.model_name),
      })),
    };
  },

  /** Clear this member's rows behind ONE reference — the one-at-a-time door. */
  async purgeGroup(
    request_doc_id: string,
    input: { model_name: string; field_path: string },
    actor_id: string
  ) {
    const doc = await findRequest(request_doc_id);
    assertActionable(doc);
    // Re-counted rather than trusted from the client: the page may have been
    // open for an hour, and a stale field path must not become a blind delete.
    const trace = await userTrace(String(doc.user_id));
    const group = trace.find(
      (g) => g.model_name === input.model_name && g.field_path === input.field_path
    );
    if (!group) {
      throw new GraphQLError('That trace is already clear', { extensions: { code: 'NOT_FOUND' } });
    }
    // The write and the record of the write commit together. Without the
    // transaction a failure between them leaves rows deleted that the purge log
    // never names — and the log is what the next operator trusts.
    await withTransaction(async (session) => {
      const removed = await purgeReference(group, String(doc.user_id), session);
      // `$push` rather than mutating the loaded document: withTransaction
      // re-runs its callback on a write conflict, and an in-memory array that
      // survives the rollback would gain a second copy of the same entry.
      await AccountDeletionRequestModel.updateOne(
        { _id: doc._id },
        { $push: { purge_log: logEntry(group, removed, requireObjectId(actor_id, 'actor')) } },
        { session }
      );
    });
    return accountDeletionService.detail(request_doc_id);
  },

  /**
   * Finish the request: whatever is left, then the account itself.
   *
   * The console walks the trace one reference at a time through `purgeGroup`
   * so an operator watches it happen, and this is the last step — but it
   * re-counts rather than assuming that list was complete. A page left open
   * while the member kept using the account has a stale trace, and "delete
   * everything" has to mean it.
   *
   * The account document goes LAST inside the same transaction. Ordering still
   * matters even when the whole step is atomic, because the topology may have
   * no transactions (a standalone mongod in local dev): there the account is
   * still removed after the rows that name it, so an interrupted run leaves a
   * request that names a user the next attempt can search by.
   *
   * ONE transaction, not one per reference: a member who is half-deleted is the
   * failure this feature cannot have. The cost is Mongo's 16MB/60s ceiling on a
   * single transaction, which a member with tens of thousands of telemetry rows
   * can hit — that is what the per-reference door is for. Clear the big
   * collections one at a time first and this runs on the remainder.
   *
   * `actor_id` is null when the scheduled sweep is the caller. The purge log
   * then records the act with no name against it, which is the truth: nobody
   * pressed anything, and the run that did it is its own audit row.
   */
  async purgeAll(request_doc_id: string, actor_id: string | null) {
    const doc = await findRequest(request_doc_id);
    assertActionable(doc);
    const userId = String(doc.user_id);
    const actor = actor_id === null ? null : requireObjectId(actor_id, 'actor');
    const trace = await userTrace(userId);

    await withTransaction(async (session) => {
      const entries: ReturnType<typeof logEntry>[] = [];
      // Sequential, not parallel: ~150 concurrent deleteMany calls on one
      // connection is a burst that competes with live traffic, and this is a
      // one-off somebody is sitting and watching.
      for (const group of trace) {
        const removed = await purgeReference(group, userId, session);
        entries.push(logEntry(group, removed, actor));
      }
      await UserModel.deleteOne({ _id: doc.user_id }, { session });
      await AccountDeletionRequestModel.updateOne(
        { _id: doc._id },
        {
          $push: { purge_log: { $each: entries } },
          $set: { status: 'COMPLETED', reviewed_by: actor, reviewed_at: new Date() },
        },
        { session }
      );
    });
    // Housekeeping, not enforcement: the account document is gone, so every
    // token naming it is already answered by nothing. Dropping the id keeps the
    // seal map from growing by one row per deleted member forever.
    releaseAccount(userId);
    return accountDeletionService.detail(request_doc_id);
  },

  /**
   * Turn it down, with a reason the member can be told.
   *
   * This is now the ONLY way back for somebody who changed their mind: filing
   * the request signed them out and closed the door behind them, so the console
   * is where the decision gets reversed. Rejecting reopens the account and its
   * existing sessions along with it.
   */
  async reject(request_doc_id: string, note: string, actor_id: string) {
    const doc = await findRequest(request_doc_id);
    assertActionable(doc);
    doc.status = 'REJECTED';
    doc.note = (note ?? '').trim();
    doc.reviewed_by = requireObjectId(actor_id, 'actor');
    doc.reviewed_at = new Date();
    await doc.save();
    releaseAccount(String(doc.user_id));
    return accountDeletionService.detail(request_doc_id);
  },
};
