import { Schema, model } from 'mongoose';

/**
 * The two ends of a clone, connected from the Tech portal instead of the
 * environment.
 *
 * There is exactly ONE document per role — the pair is a setting, not a list —
 * so `role` is unique and every write is an upsert on it.
 *
 * `connected` is never set by a save: it is the outcome of actually reaching
 * the cluster and listing the database, and it is cleared the moment either the
 * URI or the database name changes. That is what the Start button reads, so a
 * connection string that was pasted but never proved can never start a clone.
 *
 * NOTE: this collection holds live database credentials, which is why
 * `datacloneconnections` is in EXCLUDED_COLLECTIONS — a clone that copied it
 * would hand staging production's own connection string, and would overwrite
 * the settings of the very server running the copy.
 */
export const DATA_CLONE_ROLES = ['PRODUCTION', 'STAGING'] as const;
export type DataCloneRole = (typeof DATA_CLONE_ROLES)[number];

const dataCloneConnectionSchema = new Schema(
  {
    role: { type: String, enum: DATA_CLONE_ROLES, required: true, unique: true },
    /** Full connection string, credentials included. Never returned to a client. */
    uri: { type: String, default: '' },
    database: { type: String, default: '', trim: true },
    connected: { type: Boolean, default: false },
    /** Collections found on the last successful probe — proof of what it reached. */
    collection_count: { type: Number, default: 0 },
    last_tested_at: { type: Date, default: null },
    last_test_error: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

/**
 * Declared rather than inferred: `timestamps` makes InferSchemaType add a
 * `[x: string]: Date` index signature that swallows every other field's type.
 */
export interface DataCloneConnectionDoc {
  _id: unknown;
  role: DataCloneRole;
  uri: string;
  database: string;
  connected: boolean;
  collection_count: number;
  last_tested_at?: Date | null;
  last_test_error?: string | null;
}

export const DataCloneConnectionModel = model('DataCloneConnection', dataCloneConnectionSchema);
