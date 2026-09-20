import { Schema, model, type Document } from 'mongoose';

/**
 * The ShipRocket login we are holding — one row.
 *
 * Kept in the database, not in process memory, because both halves have to
 * outlive a deploy:
 *
 * - the TOKEN is good for 240 hours, and logging in again on every boot is a
 *   login ShipRocket counts;
 * - a REFUSED login must stay refused. Retrying a wrong password cannot make
 *   it right, and ShipRocket locks the account ("too many failed login
 *   attempts") when something keeps trying — which is what an in-memory latch
 *   cleared by every restart did.
 *
 * Both are keyed on a hash of the email + password, so changing the
 * credentials in the Tech portal is what clears a refusal: the next call sees a
 * different hash and logs in afresh. Nothing else has to remember to reset it.
 */
export interface IShiprocketSession extends Document {
  key: string;
  cred_hash: string;
  token: string;
  expires_at: Date | null;
  /** When the held token was issued — what caps how often a refused call may ask for a new one. */
  issued_at: Date | null;
  refused_hash: string;
  refused_message: string;
  refused_at: Date | null;
  updated_at: Date;
}

const shiprocketSessionSchema = new Schema<IShiprocketSession>(
  {
    key: { type: String, required: true, unique: true },
    cred_hash: { type: String, default: '' },
    token: { type: String, default: '', select: false },
    expires_at: { type: Date, default: null },
    issued_at: { type: Date, default: null },
    refused_hash: { type: String, default: '' },
    refused_message: { type: String, default: '' },
    refused_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' } }
);

export const ShiprocketSessionModel = model<IShiprocketSession>('ShiprocketSession', shiprocketSessionSchema);
