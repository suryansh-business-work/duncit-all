import { Schema, model, type Document } from 'mongoose';

/**
 * One unlocked Environment Variables session — written when the root admin's
 * emailed code is typed, gone when it expires.
 *
 * Keyed by the sha256 of the caller's OWN bearer token, never the user: signing
 * in again, or from another browser, is a new token and so a new code. Only the
 * hash is stored, so a read of this collection cannot replay a session.
 */
export interface IEnvAccessGrant extends Document {
  session_hash: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
}

const envAccessGrantSchema = new Schema<IEnvAccessGrant>(
  {
    session_hash: { type: String, required: true, unique: true },
    user_id: { type: String, required: true, index: true },
    // Mongo drops the row once it has expired; reads still check the time, as
    // the TTL monitor only runs once a minute.
    expires_at: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const EnvAccessGrantModel = model<IEnvAccessGrant>('EnvAccessGrant', envAccessGrantSchema);
