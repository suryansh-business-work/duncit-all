import { Schema, model } from 'mongoose';

/**
 * One database backup run, and the schedule that produces them.
 *
 * A run is persisted for the same reason a clone job is: the archive is written
 * in the BACKGROUND, so the browser that asked for it can be closed and any
 * other client must read the same progress. `heartbeat_at` is what makes a
 * restart detectable — nothing ticks it while the process is down, so a run
 * still marked RUNNING with a stale heartbeat is reported as interrupted rather
 * than hanging on screen forever.
 */
export const DB_BACKUP_STATUSES = ['RUNNING', 'SUCCEEDED', 'FAILED'] as const;
export type DbBackupStatus = (typeof DB_BACKUP_STATUSES)[number];

/**
 * Who asked for it. SCHEDULED rows are what retention prunes.
 *
 * UPLOADED is an archive this server did not take: it was sent in from an
 * operator's machine — production's nightly carried to staging, a copy pulled
 * before a migration. It is never pruned, for the same reason a MANUAL one is
 * not, and it only becomes restorable once it has been read end to end.
 */
export const DB_BACKUP_TRIGGERS = ['SCHEDULED', 'MANUAL', 'UPLOADED'] as const;
export type DbBackupTrigger = (typeof DB_BACKUP_TRIGGERS)[number];

export const DB_BACKUP_FREQUENCIES = ['DAILY', 'WEEKLY'] as const;
export type DbBackupFrequency = (typeof DB_BACKUP_FREQUENCIES)[number];

/** What one collection contributed. Written as the walk finishes each one. */
const collectionSchema = new Schema(
  {
    name: { type: String, required: true },
    documents: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },
  },
  { _id: false },
);

const dbBackupSchema = new Schema(
  {
    status: { type: String, enum: DB_BACKUP_STATUSES, default: 'RUNNING', index: true },
    trigger: { type: String, enum: DB_BACKUP_TRIGGERS, default: 'MANUAL', index: true },
    /**
     * The database the archive holds. Not required: an upload's row exists
     * before a byte of it has been read, and the name is whatever the archive's
     * own header says — which is the point of an upload, since it is usually
     * not this server's database.
     */
    database: { type: String, default: '' },
    /**
     * Basename of the archive on disk, or null once the file is gone — pruned
     * by retention, deleted by hand, or never written because the run failed.
     * The row outlives the file deliberately: what was backed up and when is
     * the history an operator reads, and deleting an archive must not erase it.
     */
    file_name: { type: String, default: null },
    size_bytes: { type: Number, default: 0 },
    /** Uncompressed bytes handed to the writer; with size_bytes it shows the ratio. */
    raw_bytes: { type: Number, default: 0 },
    documents_total: { type: Number, default: 0 },
    collections: { type: [collectionSchema], default: [] },
    current_collection: { type: String, default: null },
    error: { type: String, default: null },
    started_by: { type: String, default: null },
    started_at: { type: Date, default: Date.now },
    /**
     * When the archive was TAKEN, read from its own header — only meaningful on
     * an uploaded one, where it is not the same thing as started_at at all.
     * A restore has to say how old the data is, and for an upload started_at is
     * the day someone dragged the file in, not the day the data is from.
     */
    archive_taken_at: { type: Date, default: null },
    finished_at: { type: Date, default: null },
    heartbeat_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

dbBackupSchema.index({ started_at: -1 });

/**
 * The shape reads work against. Declared rather than inferred: `timestamps`
 * makes InferSchemaType add a `[x: string]: Date` index signature, which then
 * swallows every other field's type at the call site.
 */
export interface DbBackupCollectionDoc {
  name: string;
  documents: number;
  bytes: number;
}

export interface DbBackupDoc {
  _id: unknown;
  status: string;
  trigger: string;
  database: string;
  file_name?: string | null;
  size_bytes: number;
  raw_bytes: number;
  documents_total: number;
  collections: DbBackupCollectionDoc[];
  current_collection?: string | null;
  error?: string | null;
  started_by?: string | null;
  started_at: Date;
  archive_taken_at?: Date | null;
  finished_at?: Date | null;
  heartbeat_at?: Date | null;
  created_at?: Date;
}

export const DbBackupModel = model('DbBackup', dbBackupSchema);

/**
 * The schedule, as a singleton. `last_run_at` is the scheduler's memory: it is
 * what stops a restart from re-running a backup the previous process already
 * took, and it moves whether that run succeeded or failed — a database that
 * cannot be read will not be readable a minute later either, and retrying every
 * tick would fill the table with failures instead of leaving the one to read.
 */
const dbBackupSettingsSchema = new Schema(
  {
    key: { type: String, default: 'db-backup', unique: true },
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: DB_BACKUP_FREQUENCIES, default: 'DAILY' },
    /** Local-to-the-server 24h time, `HH:mm`. */
    time_of_day: { type: String, default: '03:00' },
    /** 0 = Sunday. Only read when frequency is WEEKLY. */
    weekday: { type: Number, default: 0, min: 0, max: 6 },
    /** How many SCHEDULED archives to keep. Manual ones are never pruned. */
    keep_last: { type: Number, default: 7, min: 1, max: 90 },
    last_run_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export interface DbBackupSettingsDoc {
  _id: unknown;
  enabled: boolean;
  frequency: string;
  time_of_day: string;
  weekday: number;
  keep_last: number;
  last_run_at?: Date | null;
}

export const DbBackupSettingsModel = model('DbBackupSettings', dbBackupSettingsSchema);

/**
 * One restore run.
 *
 * Tracked separately from a backup because it is the opposite operation with
 * the opposite risk: a backup that fails costs an archive, a restore that fails
 * costs the database. The row is what an operator watches while it happens and
 * what they read afterwards to see which collections actually came back.
 */
export const DB_RESTORE_STATUSES = ['RUNNING', 'SUCCEEDED', 'FAILED'] as const;
export type DbRestoreStatus = (typeof DB_RESTORE_STATUSES)[number];

const restoredCollectionSchema = new Schema(
  {
    name: { type: String, required: true },
    documents: { type: Number, default: 0 },
    error: { type: String, default: null },
  },
  { _id: false },
);

const dbRestoreSchema = new Schema(
  {
    status: { type: String, enum: DB_RESTORE_STATUSES, default: 'RUNNING', index: true },
    backup_id: { type: Schema.Types.ObjectId, ref: 'DbBackup', required: true },
    backup_file: { type: String, required: true },
    /** When the archive being restored was taken. */
    backup_taken_at: { type: Date, default: null },
    collections: { type: [restoredCollectionSchema], default: [] },
    current_collection: { type: String, default: null },
    documents_restored: { type: Number, default: 0 },
    /** Collections deliberately left alone; see the restore service. */
    skipped: { type: [String], default: [] },
    error: { type: String, default: null },
    started_by: { type: String, default: null },
    started_at: { type: Date, default: Date.now },
    finished_at: { type: Date, default: null },
    heartbeat_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

dbRestoreSchema.index({ started_at: -1 });

export interface DbRestoreCollectionDoc {
  name: string;
  documents: number;
  error?: string | null;
}

export interface DbRestoreDoc {
  _id: unknown;
  status: string;
  backup_id: unknown;
  backup_file: string;
  backup_taken_at?: Date | null;
  collections: DbRestoreCollectionDoc[];
  current_collection?: string | null;
  documents_restored: number;
  skipped: string[];
  error?: string | null;
  started_by?: string | null;
  started_at: Date;
  finished_at?: Date | null;
  heartbeat_at?: Date | null;
}

export const DbRestoreModel = model('DbRestore', dbRestoreSchema);
