import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { RequestIdentity } from '@observability/requestIdentity';

/**
 * One long-running piece of work a person started from a console — today, a
 * bulk delete from a table.
 *
 * It is a document rather than a promise in memory because the work outlives
 * everything around it: the page that started it, the tab, and the server
 * process itself (a deploy restarts the container mid-delete). The header's
 * progress ring reads these rows, so a refresh shows the same percentage, and
 * the runner resumes every RUNNING row on boot from `cursor`.
 */

export const JOB_STATUSES = ['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;
export type BackgroundJobStatus = (typeof JOB_STATUSES)[number];

/** SELECTED acts on the ticked ids; ALL on every row matching the table's view. */
export const DELETE_MODES = ['SELECTED', 'ALL'] as const;
export type BulkDeleteMode = (typeof DELETE_MODES)[number];

/** Who started it — replayed as the caller of every delete the job runs. */
export interface JobActor {
  id: string;
  email: string;
  roles: string[];
}

/** One row the delete refused, with the reason its own mutation gave. */
export interface JobRowFailure {
  id: string;
  message: string;
}

export interface BackgroundJobFields {
  kind: 'BULK_DELETE';
  /** The `<name>Table` query the rows come from. */
  table: string;
  /** What the person was looking at, as their console named it. */
  label: string;
  /** The page it was started from, so the drawer can lead back to it. */
  url: string;
  mode: BulkDeleteMode;
  /** The table query's variables — search, filters and pinned arguments. */
  variables: Record<string, unknown>;
  /** SELECTED only: the ticked row ids. */
  ids: string[];
  status: BackgroundJobStatus;
  /** Rows in scope when the job started. */
  total: number;
  succeeded: number;
  failed: number;
  /** The first few refusals — enough to say why, not a copy of every one. */
  failures: JobRowFailure[];
  /** Why the whole job stopped, when it did. */
  error_message: string;
  /** The last `_id` handled; the runner continues after it. */
  cursor: unknown;
  /**
   * The newest `_id` in scope at the start. Rows created after the click are
   * not part of what the person agreed to delete.
   */
  max_id: unknown;
  actor: JobActor;
  /** The starting request's identity, so change logs attribute each delete. */
  identity: RequestIdentity;
  /** Which server process is working it, and until when that claim holds. */
  lease_owner: string;
  lease_until: Date | null;
  finished_at: Date | null;
  dismissed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type IBackgroundJob = BackgroundJobFields & Document;

/** A job read with `.lean()` — plain arrays and objects, which is what the runner hands on. */
export type LeanBackgroundJob = BackgroundJobFields & { _id: Types.ObjectId };

/** Finished jobs linger in the drawer for a week, then Mongo removes them. */
const FINISHED_TTL_SECONDS = 7 * 24 * 60 * 60;

const failureSchema = new Schema<JobRowFailure>(
  { id: { type: String, required: true }, message: { type: String, default: '' } },
  { _id: false }
);

const backgroundJobSchema = new Schema<IBackgroundJob>(
  {
    kind: { type: String, enum: ['BULK_DELETE'], default: 'BULK_DELETE' },
    table: { type: String, required: true },
    label: { type: String, default: '' },
    url: { type: String, default: '' },
    mode: { type: String, enum: DELETE_MODES, required: true },
    variables: { type: Schema.Types.Mixed, default: {} },
    ids: { type: [String], default: [] },
    status: { type: String, enum: JOB_STATUSES, default: 'RUNNING', index: true },
    total: { type: Number, default: 0 },
    succeeded: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    failures: { type: [failureSchema], default: [] },
    error_message: { type: String, default: '' },
    cursor: { type: Schema.Types.Mixed, default: null },
    max_id: { type: Schema.Types.Mixed, default: null },
    actor: {
      id: { type: String, required: true },
      email: { type: String, default: '' },
      roles: { type: [String], default: [] },
    },
    identity: { type: Schema.Types.Mixed, default: {} },
    lease_owner: { type: String, default: '' },
    lease_until: { type: Date, default: null },
    finished_at: { type: Date, default: null },
    dismissed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, minimize: false }
);

backgroundJobSchema.index({ 'actor.id': 1, dismissed_at: 1, created_at: -1 });
backgroundJobSchema.index({ finished_at: 1 }, { expireAfterSeconds: FINISHED_TTL_SECONDS });

export const BackgroundJobModel =
  (mongoose.models.BackgroundJob as mongoose.Model<IBackgroundJob>) ||
  mongoose.model<IBackgroundJob>('BackgroundJob', backgroundJobSchema);
