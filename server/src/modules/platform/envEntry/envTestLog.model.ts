import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * One press of an entry's Test button and what it answered — the history the
 * entry's own `last_tested_at` / `last_test_ok` only show the newest line of.
 *
 * Only the headline `message` is kept: it never carries a credential, while a
 * rich result's `data` can (MSG91's access token), so that field stays out.
 */
export interface IEnvTestLog extends Document {
  entry_id: Types.ObjectId;
  category: string;
  entry_name: string;
  /** Which test ran: CONNECTION, EMAIL, IMAGEKIT, … */
  kind: string;
  ok: boolean;
  message: string;
  tested_by: Types.ObjectId | null;
  created_at: Date;
}

/** How long a line is kept. A test older than this says nothing about today's keys. */
const KEEP_DAYS = 180;

const envTestLogSchema = new Schema<IEnvTestLog>(
  {
    entry_id: { type: Schema.Types.ObjectId, ref: 'EnvEntry', required: true },
    category: { type: String, required: true },
    entry_name: { type: String, default: '' },
    kind: { type: String, required: true },
    ok: { type: Boolean, required: true },
    message: { type: String, default: '' },
    tested_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

envTestLogSchema.index({ entry_id: 1, created_at: -1 });
envTestLogSchema.index({ created_at: -1 }, { expireAfterSeconds: KEEP_DAYS * 24 * 60 * 60 });

export const EnvTestLogModel = model<IEnvTestLog>('EnvTestLog', envTestLogSchema);
