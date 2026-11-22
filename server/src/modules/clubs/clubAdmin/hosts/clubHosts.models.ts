import { Schema, model, Types, type Document } from 'mongoose';

/**
 * The three records behind Club Admin host management.
 *
 *   ClubHostEngagement      where a club admin has filed one host of one club
 *                           (the configurable status + a note), with a capped
 *                           history of every change. Signed-in writes are also
 *                           diffed into the global table change log.
 *   HostPerformanceSnapshot one host's completed pods, target and score for one
 *                           finished month in one club — the audit of every
 *                           monthly calculation, and the score history the
 *                           host page draws. Written once per (club, host,
 *                           period) by an idempotent upsert.
 *   HostPerformanceRun      one monthly job run: claimed atomically on its
 *                           period, so two processes (or a restart mid-run)
 *                           can never calculate or notify a month twice.
 */

/** How many past status changes a host's engagement record keeps. */
export const ENGAGEMENT_HISTORY_CAP = 50;

export interface IEngagementChange {
  status_key: string;
  note?: string | null;
  updated_by: Types.ObjectId;
  updated_at: Date;
}

/** The user fields the host screens and the monthly messages read (a lean, projected read). */
export interface HostUserLean {
  _id?: Types.ObjectId | string;
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    profile_photo?: string | null;
    locale?: string | null;
  } | null;
  auth?: { email?: string | null; phone?: { extension?: string | null; number?: string | null } | null } | null;
  communication?: { whatsapp?: { extension?: string | null; number?: string | null } | null } | null;
}

export interface IClubHostEngagement extends Document {
  club_id: Types.ObjectId;
  host_user_id: Types.ObjectId;
  status_key: string;
  note?: string | null;
  updated_by: Types.ObjectId;
  history: IEngagementChange[];
  created_at: Date;
  updated_at: Date;
}

const engagementChangeSchema = new Schema<IEngagementChange>(
  {
    status_key: { type: String, required: true },
    note: { type: String, default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updated_at: { type: Date, required: true },
  },
  { _id: false }
);

const clubHostEngagementSchema = new Schema<IClubHostEngagement>(
  {
    club_id: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    host_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status_key: { type: String, required: true },
    note: { type: String, trim: true, maxlength: 1000, default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    history: { type: [engagementChangeSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
clubHostEngagementSchema.index({ club_id: 1, host_user_id: 1 }, { unique: true });

export const ClubHostEngagementModel = model<IClubHostEngagement>(
  'ClubHostEngagement',
  clubHostEngagementSchema
);

export interface IHostPerformanceSnapshot extends Document {
  club_id: Types.ObjectId;
  host_user_id: Types.ObjectId;
  /** `YYYY-MM` in the admin's time zone. */
  period: string;
  completed: number;
  target: number;
  score: number;
  computed_at: Date;
}

const snapshotSchema = new Schema<IHostPerformanceSnapshot>({
  club_id: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
  host_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  period: { type: String, required: true },
  completed: { type: Number, required: true, min: 0 },
  target: { type: Number, required: true, min: 1 },
  score: { type: Number, required: true, min: 0, max: 100 },
  computed_at: { type: Date, required: true },
});
snapshotSchema.index({ club_id: 1, host_user_id: 1, period: 1 }, { unique: true });

export const HostPerformanceSnapshotModel = model<IHostPerformanceSnapshot>(
  'HostPerformanceSnapshot',
  snapshotSchema
);

export type HostPerformanceRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface IHostPerformanceRun extends Document {
  period: string;
  status: HostPerformanceRunStatus;
  started_at: Date;
  finished_at?: Date | null;
  clubs: number;
  hosts: number;
  /** Messages queued (each is deduplicated again per channel by the notify layer). */
  host_notified: number;
  admin_notified: number;
  /** Whether notifications were switched on when the run went out. */
  notified: boolean;
  error_messages: string[];
}

const runSchema = new Schema<IHostPerformanceRun>({
  period: { type: String, required: true },
  status: { type: String, enum: ['RUNNING', 'COMPLETED', 'FAILED'], required: true },
  started_at: { type: Date, required: true },
  finished_at: { type: Date, default: null },
  clubs: { type: Number, default: 0 },
  hosts: { type: Number, default: 0 },
  host_notified: { type: Number, default: 0 },
  admin_notified: { type: Number, default: 0 },
  notified: { type: Boolean, default: false },
  error_messages: { type: [String], default: [] },
});
runSchema.index({ period: 1 }, { unique: true });

export const HostPerformanceRunModel = model<IHostPerformanceRun>('HostPerformanceRun', runSchema);
