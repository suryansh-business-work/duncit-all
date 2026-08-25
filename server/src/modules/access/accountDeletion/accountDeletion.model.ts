import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * A member asking for their account to be removed.
 *
 * Self-serve deletion used to purge the account the moment the emailed code
 * checked out. It no longer does: a deletion is irreversible and reaches into
 * every collection the person appears in, so the request is queued here and a
 * human in the Tech portal carries it out. The account stays fully usable in
 * the meantime — a mis-tap costs nothing, and the member can withdraw it.
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

/**
 * How long an account stays after its owner asks for it to go.
 *
 * A singleton, so the number the apps warn with, the date stamped on a request
 * and the countdown the Tech queue sorts by are all one value. The window is
 * not a delay for its own sake: it is the grace period a member can change
 * their mind in, and the apps say the date out loud precisely so nobody has to
 * take "soon" on trust.
 */
export interface IAccountDeletionSettings extends Document {
  retention_days: number;
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
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const AccountDeletionSettingsModel = model<IAccountDeletionSettings>(
  'AccountDeletionSettings',
  settingsSchema
);
