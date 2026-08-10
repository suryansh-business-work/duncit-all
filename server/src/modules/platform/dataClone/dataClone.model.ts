import { Schema, model } from 'mongoose';

/**
 * A production -> staging clone job.
 *
 * Persisted because the copy runs in the BACKGROUND on the server: the browser
 * that started it can be closed, and any other client must be able to read the
 * same progress. `heartbeat_at` is what makes a restart detectable — nothing
 * ticks it while the process is down, so a job still marked RUNNING with a
 * stale heartbeat is reported as interrupted instead of hanging forever.
 */
export const DATA_CLONE_STATUSES = ['RUNNING', 'SUCCEEDED', 'FAILED'] as const;
export type DataCloneStatus = (typeof DATA_CLONE_STATUSES)[number];

export const DATA_CLONE_COLLECTION_STATUSES = ['PENDING', 'COPYING', 'DONE', 'FAILED'] as const;
export type DataCloneCollectionStatus = (typeof DATA_CLONE_COLLECTION_STATUSES)[number];

/** One collection's slice of the job. `bytes` is the BSON size actually copied. */
const collectionProgressSchema = new Schema(
  {
    name: { type: String, required: true },
    status: { type: String, enum: DATA_CLONE_COLLECTION_STATUSES, default: 'PENDING' },
    source_count: { type: Number, default: 0 },
    copied_count: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },
    error: { type: String, default: null },
    started_at: { type: Date, default: null },
    finished_at: { type: Date, default: null },
  },
  { _id: false },
);

const dataCloneJobSchema = new Schema(
  {
    status: { type: String, enum: DATA_CLONE_STATUSES, default: 'RUNNING', index: true },
    source_database: { type: String, required: true },
    target_database: { type: String, required: true },
    current_collection: { type: String, default: null },
    collections: { type: [collectionProgressSchema], default: [] },
    excluded: { type: [String], default: [] },
    error: { type: String, default: null },
    started_by: { type: String, default: null },
    started_at: { type: Date, default: Date.now },
    finished_at: { type: Date, default: null },
    heartbeat_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

dataCloneJobSchema.index({ started_at: -1 });

/**
 * The shape reads work against. Declared rather than inferred: `timestamps`
 * makes InferSchemaType add a `[x: string]: Date` index signature, which then
 * swallows every other field's type at the call site.
 */
export interface DataCloneCollectionDoc {
  name: string;
  status: string;
  source_count: number;
  copied_count: number;
  bytes: number;
  error?: string | null;
  started_at?: Date | null;
  finished_at?: Date | null;
}

export interface DataCloneJobDoc {
  _id: unknown;
  status: string;
  source_database: string;
  target_database: string;
  current_collection?: string | null;
  collections: DataCloneCollectionDoc[];
  excluded: string[];
  error?: string | null;
  started_by?: string | null;
  started_at: Date;
  finished_at?: Date | null;
  heartbeat_at?: Date | null;
}

export const DataCloneJobModel = model('DataCloneJob', dataCloneJobSchema);
