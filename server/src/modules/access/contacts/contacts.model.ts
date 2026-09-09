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
  /** How many of the submitted numbers reached nobody — the invite list's size. */
  invitable: number;
}

const contactSyncSchema = new Schema<IContactSync>(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    synced_at: { type: Date, required: true },
    submitted: { type: Number, default: 0 },
    matched: { type: Number, default: 0 },
    invitable: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ContactSyncModel = model<IContactSync>('ContactSync', contactSyncSchema);

/**
 * One phone-book number of `owner_id` that reached NO Duncit account — the
 * invite list.
 *
 * The matched half of a sync is a social graph; this half is an address book,
 * which is why it is deliberately narrow: the comparable key of the number, the
 * name it was saved under, and whether an invite has already gone to it.
 * `clearMyContacts` deletes it with the matches, and a number that leaves the
 * phone book leaves this collection on the next sync — the same rule the
 * matches follow.
 */
export interface IContactInvite extends Document {
  owner_id: Types.ObjectId;
  /** Last ten digits — the same key the matcher compares numbers on. */
  phone_key: string;
  contact_label: string;
  /** When an invite last went to this number, or null while none has. */
  invited_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const contactInviteSchema = new Schema<IContactInvite>(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    phone_key: { type: String, required: true },
    contact_label: { type: String, default: '', trim: true, maxlength: 120 },
    invited_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

contactInviteSchema.index({ owner_id: 1, phone_key: 1 }, { unique: true });
contactInviteSchema.index({ owner_id: 1, invited_at: 1 });

export const ContactInviteModel = model<IContactInvite>('ContactInvite', contactInviteSchema);
