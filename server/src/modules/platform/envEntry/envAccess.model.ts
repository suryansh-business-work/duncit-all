import { Schema, model, type Document } from 'mongoose';

/**
 * One unlocked Environment Variables session — written when the root admin's
 * emailed code is typed, gone when it expires.
 *
 * Keyed by the sha256 of the caller's OWN bearer token. The same person's other
 * portals (each signs in with its own token) share it while they come from the
 * same network: `ip_hash` is the sha256 of the address the code was typed from.
 * Another network, or another person, still needs a code. Only hashes are
 * stored, so a read of this collection cannot replay a session.
 */
export interface IEnvAccessGrant extends Document {
  session_hash: string;
  user_id: string;
  ip_hash: string;
  expires_at: Date;
  created_at: Date;
}

const envAccessGrantSchema = new Schema<IEnvAccessGrant>(
  {
    session_hash: { type: String, required: true, unique: true },
    user_id: { type: String, required: true, index: true },
    ip_hash: { type: String, default: '' },
    // Mongo drops the row once it has expired; reads still check the time, as
    // the TTL monitor only runs once a minute.
    expires_at: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const EnvAccessGrantModel = model<IEnvAccessGrant>('EnvAccessGrant', envAccessGrantSchema);
