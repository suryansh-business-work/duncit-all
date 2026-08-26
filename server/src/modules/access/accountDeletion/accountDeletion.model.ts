import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * A member asking for their account to be removed.
 *
 * Self-serve deletion used to purge the account the moment the emailed code
 * checked out. It no longer does: a deletion is irreversible and reaches into
 * every collection the person appears in, so the request is queued here and
 * carried out later — by the scheduled sweep once the grace period is up, or
 * by a human in the Tech portal before then.
 *
 * The ACCOUNT, though, ends the moment the code checks out. It is signed out
 * everywhere and can no longer sign in (see `accountDeletion.lock.ts`), which
 * is what makes the queue a record of accounts on their way out rather than a
 * list of people still using Duncit. Reversing that is `reject`, from the
 * console — the member has no session left to do it from.
 */
export const DELETION_REQUEST_STATUSES = [
  'PENDING',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
] as const;
export type DeletionRequestStatus = (typeof DELETION_REQUEST_STATUSES)[number];

/** Which app the request was filed from. Recorded because the two flows are
 * meant to be identical, and a gap only shows up as a lopsided queue. */
export const DELETION_REQUEST_SURFACES = ['MWEB', 'APP', 'UNKNOWN'] as const;
export type DeletionRequestSurface = (typeof DELETION_REQUEST_SURFACES)[number];

/** One collection's worth of rows removed while carrying a request out. */
export interface IDeletionPurgeEntry {
  model_name: string;
  collection_name: string;
  field_path: string;
  removed: number;
  purged_at: Date;
  purged_by: Types.ObjectId | null;
}

export interface IAccountDeletionRequest extends Document {
  request_id: string;
  user_id: Types.ObjectId;
  /**
   * The member's identity as it read WHEN THEY ASKED.
   *
   * Copied rather than joined, because carrying the request out destroys the
   * user document it would have joined to — and a completed row that can no
   * longer say who it was about is a useless audit trail.
   */
  snapshot_name: string;
  snapshot_email: string;
  snapshot_phone: string;
  reason: string;
  surface: DeletionRequestSurface;
  status: DeletionRequestStatus;
  requested_at: Date;
  /**
   * The date the member was promised, stamped when they asked.
   *
   * Stamped and not derived: the retention window is an admin setting, and
   * somebody who was told "30 days" must not silently become "60 days" because
   * the setting moved after they asked. Changing it applies to the next
   * request, never to one already in the queue.
   */
  scheduled_delete_at: Date;
  /**
   * Claimed by the sweep that is carrying this request out right now.
   *
   * A lock, not a timestamp anybody reads. The scheduled job sets it in the
   * same conditional update that checks it is still null, so of two sweeps that
   * both found this request due exactly one goes on to delete anything — and a
   * sweep killed mid-flight leaves a row that is still PENDING, still in the
   * queue, and retried as soon as the claim is cleared.
   */
  purge_started_at: Date | null;
  reviewed_by: Types.ObjectId | null;
  reviewed_at: Date | null;
  note: string;
  purge_log: IDeletionPurgeEntry[];
  created_at: Date;
  updated_at: Date;
}

const purgeEntrySchema = new Schema<IDeletionPurgeEntry>(
  {
    model_name: { type: String, required: true },
    collection_name: { type: String, required: true },
    field_path: { type: String, required: true },
    removed: { type: Number, required: true, min: 0 },
    purged_at: { type: Date, required: true },
    purged_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const schema = new Schema<IAccountDeletionRequest>(
  {
    request_id: { type: String, required: true, unique: true, trim: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    snapshot_name: { type: String, default: '', trim: true },
    snapshot_email: { type: String, default: '', trim: true, lowercase: true, index: true },
    snapshot_phone: { type: String, default: '', trim: true },
    reason: { type: String, default: '', trim: true, maxlength: 1000 },
    surface: { type: String, enum: DELETION_REQUEST_SURFACES, default: 'UNKNOWN' },
    status: { type: String, enum: DELETION_REQUEST_STATUSES, default: 'PENDING', index: true },
    requested_at: { type: Date, required: true },
    scheduled_delete_at: { type: Date, required: true, index: true },
    purge_started_at: { type: Date, default: null },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
    note: { type: String, default: '', trim: true, maxlength: 2000 },
    purge_log: { type: [purgeEntrySchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

/*
  One OPEN request per account, and only one.
  
  Partial on PENDING rather than unique on user_id: an account that was once
  cancelled must be able to ask again, and a completed row has to stay put as
  the record of what was done. Without the filter the second ask would collide
  with the first person's history.
*/
schema.index(
  { user_id: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);

// The Tech queue's default view: the open ones, oldest first — somebody has
// been waiting longest.
schema.index({ status: 1, requested_at: 1 });

export const AccountDeletionRequestModel = model<IAccountDeletionRequest>(
  'AccountDeletionRequest',
  schema
);

/** The default the product promises today, and the seed for a fresh install. */
export const DEFAULT_DELETION_RETENTION_DAYS = 30;

export const DELETION_CRON_FREQUENCIES = ['DAILY', 'WEEKLY'] as const;
export type DeletionCronFrequency = (typeof DELETION_CRON_FREQUENCIES)[number];

/** The default sweep: nightly at 03:00, the quiet hour a purge belongs in. */
export const DEFAULT_DELETION_CRON_TIME = '03:00';
/**
 * How many accounts one sweep will carry out.
 *
 * A ceiling and not a target. Each account is purged in its own transaction
 * across every collection it appears in, so a night that inherits a thousand
 * due requests must not try to be the night that clears all of them — it takes
 * the oldest few dozen and the next run takes the rest. The queue drains; the
 * database stays answerable while it does.
 */
export const DEFAULT_DELETION_CRON_BATCH = 25;

/**
 * How long an account stays after its owner asks for it to go, and when the
 * job that carries the request out is allowed to run.
 *
 * A singleton, so the number the apps warn with, the date stamped on a request
 * and the countdown the queue sorts by are all one value. The window is not a
 * delay for its own sake: it is the grace period the decision can be reversed
 * in, and the apps say the date out loud precisely so nobody has to take
 * "soon" on trust. The schedule lives beside it because the two only mean
 * anything together — a window nothing acts on at the end of is not a window.
 */
export interface IAccountDeletionSettings extends Document {
  retention_days: number;
  cron_enabled: boolean;
  cron_frequency: DeletionCronFrequency;
  cron_time_of_day: string;
  cron_weekday: number;
  cron_batch_size: number;
  last_run_at: Date | null;
  updated_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const settingsSchema = new Schema<IAccountDeletionSettings>(
  {
    retention_days: {
      type: Number,
      default: DEFAULT_DELETION_RETENTION_DAYS,
      min: 1,
      max: 365,
    },
    /*
      The sweep ships OFF.

      It carries out irreversible deletions with nobody watching, so switching
      it on has to be a decision somebody made in the Admin Panel rather than
      something a deploy did to them. Until it is on, the queue behaves exactly
      as it did before: requests pile up and a human clears them.
    */
    cron_enabled: { type: Boolean, default: false },
    cron_frequency: { type: String, enum: DELETION_CRON_FREQUENCIES, default: 'DAILY' },
    /** Wall-clock `HH:mm` in the platform timezone, not the container's UTC. */
    cron_time_of_day: { type: String, default: DEFAULT_DELETION_CRON_TIME },
    /** 0 = Sunday. Only read when the frequency is WEEKLY. */
    cron_weekday: { type: Number, default: 0, min: 0, max: 6 },
    cron_batch_size: { type: Number, default: DEFAULT_DELETION_CRON_BATCH, min: 1, max: 500 },
    /**
     * The scheduler's memory, and half of what makes it idempotent.
     *
     * Claimed with a conditional update before a sweep starts, so two ticks —
     * or two processes — racing on the same due window produce exactly one run.
     * It moves whether the run succeeded or failed: a sweep that cannot reach
     * the database will not reach it a minute later either, and retrying every
     * tick would bury the one failure worth reading.
     */
    last_run_at: { type: Date, default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const AccountDeletionSettingsModel = model<IAccountDeletionSettings>(
  'AccountDeletionSettings',
  settingsSchema
);

/**
 * One sweep of the deletion queue, and what it did to each account.
 *
 * This is the audit trail the feature is required to leave, and it is written
 * whether or not anything was found: a run that deleted nobody is the evidence
 * that the sweep is alive, and a night with no row at all is the thing an
 * operator needs to notice. The per-account results stay here rather than only
 * on each request, because the question asked after the fact — "what did the
 * job do on Tuesday" — is asked of the run, not of the account it removed.
 */
export const DELETION_RUN_STATUSES = ['RUNNING', 'SUCCEEDED', 'FAILED'] as const;
export type DeletionRunStatus = (typeof DELETION_RUN_STATUSES)[number];

/** SCHEDULED = the cron fired. MANUAL = somebody pressed Run now. */
export const DELETION_RUN_TRIGGERS = ['SCHEDULED', 'MANUAL'] as const;
export type DeletionRunTrigger = (typeof DELETION_RUN_TRIGGERS)[number];

export interface IDeletionRunResult {
  request_id: string;
  user_id: Types.ObjectId;
  /** The identity as the request recorded it — the account itself is gone. */
  snapshot_email: string;
  /** PURGED, or FAILED with the reason beside it. */
  outcome: string;
  /** Rows removed or redacted across every collection, for scale not detail. */
  records: number;
  error: string;
}

export interface IAccountDeletionRun extends Document {
  run_id: string;
  trigger: DeletionRunTrigger;
  status: DeletionRunStatus;
  /** The moment the sweep judged eligibility against. */
  cutoff_at: Date;
  retention_days: number;
  /** Due requests found. `purged + failed` may be less: the batch has a ceiling. */
  eligible: number;
  purged: number;
  failed: number;
  results: IDeletionRunResult[];
  error: string;
  started_by: Types.ObjectId | null;
  started_at: Date;
  finished_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const runResultSchema = new Schema<IDeletionRunResult>(
  {
    request_id: { type: String, required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    snapshot_email: { type: String, default: '' },
    outcome: { type: String, required: true },
    records: { type: Number, default: 0, min: 0 },
    error: { type: String, default: '' },
  },
  { _id: false }
);

const runSchema = new Schema<IAccountDeletionRun>(
  {
    run_id: { type: String, required: true, unique: true, trim: true },
    trigger: { type: String, enum: DELETION_RUN_TRIGGERS, default: 'SCHEDULED' },
    status: { type: String, enum: DELETION_RUN_STATUSES, default: 'RUNNING', index: true },
    cutoff_at: { type: Date, required: true },
    retention_days: { type: Number, required: true },
    eligible: { type: Number, default: 0, min: 0 },
    purged: { type: Number, default: 0, min: 0 },
    failed: { type: Number, default: 0, min: 0 },
    results: { type: [runResultSchema], default: [] },
    error: { type: String, default: '' },
    started_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    started_at: { type: Date, default: Date.now },
    finished_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The console's default view: most recent first.
runSchema.index({ started_at: -1 });

export const AccountDeletionRunModel = model<IAccountDeletionRun>(
  'AccountDeletionRun',
  runSchema
);
