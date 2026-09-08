import { Schema, model, type Document, Types } from 'mongoose';

/**
 * One phone-book entry of `owner_id` that resolved to a Duncit account.
 *
 * The phone book itself is never stored: a sync matches the numbers and keeps
 * only the ids of the accounts they reached, so this collection is a social
 * graph, not anybody's address book. Both fields carry `ref: 'User'`, which is
 * what account deletion walks to purge a leaver from every row.
 */
export interface IContactMatch extends Document {
  owner_id: Types.ObjectId;
  contact_id: Types.ObjectId;
  /** The name the owner saved this person under, for a row whose account has none. */
  contact_label: string;
  created_at: Date;
  updated_at: Date;
}

const contactMatchSchema = new Schema<IContactMatch>(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contact_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contact_label: { type: String, default: '', trim: true, maxlength: 120 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

contactMatchSchema.index({ owner_id: 1, contact_id: 1 }, { unique: true });
contactMatchSchema.index({ owner_id: 1, created_at: -1 });

export const ContactMatchModel = model<IContactMatch>('ContactMatch', contactMatchSchema);

/**
 * When an account last synced, and what that sync found — one row per owner.
 * Kept apart from the matches so "synced, nobody matched" is distinguishable
 * from "never synced": the two need different empty states.
 */
export interface IContactSync extends Document {
  owner_id: Types.ObjectId;
  synced_at: Date;
  submitted: number;
  matched: number;
}

const contactSyncSchema = new Schema<IContactSync>(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    synced_at: { type: Date, required: true },
    submitted: { type: Number, default: 0 },
    matched: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ContactSyncModel = model<IContactSync>('ContactSync', contactSyncSchema);
