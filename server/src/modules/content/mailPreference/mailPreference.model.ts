import mongoose, { Schema, type Document } from 'mongoose';
import { EMAIL_CATEGORIES } from '@services/email/email.provider';
import { EMAIL_LOG_SOURCES, type EmailLogSource } from '@modules/content/emailLog/emailLog.model';

/**
 * What one address has asked NOT to receive.
 *
 * Keyed on the address, not on a user id: a newsletter contact, an applicant and
 * a venue owner who never signed up all receive email and all have the same
 * right to stop it. `user_id` is stamped when the address belongs to an account,
 * so the analytics screen can name a person rather than an address.
 *
 * Only opt-OUTS are stored. A new address is opted in to everything, so an
 * absent document is a complete answer — which is what makes the send path's
 * lookup cheap, and what means nothing has to be written for the millions of
 * people who never touch the screen.
 */
export interface IMailPreference extends Document {
  email: string;
  user_id: mongoose.Types.ObjectId | null;
  /** The optional categories switched off. Required ones can never appear here. */
  opted_out: string[];
  created_at: Date;
  updated_at: Date;
}

const mailPreferenceSchema = new Schema<IMailPreference>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    opted_out: { type: [String], default: [], enum: EMAIL_CATEGORIES },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const MailPreferenceModel =
  (mongoose.models.MailPreference as mongoose.Model<IMailPreference>) ||
  mongoose.model<IMailPreference>('MailPreference', mailPreferenceSchema);

/**
 * One change to one category, kept forever.
 *
 * The preference document says what is true now; this says how it got there —
 * which is the only thing that answers "when did they opt out, and from which
 * screen?". An opt-out is also the one signal marketing has that a campaign
 * landed badly, and a current-state-only model throws that away the moment
 * somebody opts back in.
 */
export interface IMailPreferenceEvent extends Document {
  email: string;
  user_id: mongoose.Types.ObjectId | null;
  category: string;
  /** true = opted back in, false = opted out. */
  enabled: boolean;
  /** The surface the change was made from — reused from the email log's list. */
  source: EmailLogSource;
  source_detail: string;
  created_at: Date;
}

const mailPreferenceEventSchema = new Schema<IMailPreferenceEvent>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    category: { type: String, required: true, enum: EMAIL_CATEGORIES, index: true },
    enabled: { type: Boolean, required: true, index: true },
    source: { type: String, enum: EMAIL_LOG_SOURCES, default: 'SERVER', index: true },
    source_detail: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// The analytics screen's default view is "newest first" over a date window.
mailPreferenceEventSchema.index({ created_at: -1 });

export const MailPreferenceEventModel =
  (mongoose.models.MailPreferenceEvent as mongoose.Model<IMailPreferenceEvent>) ||
  mongoose.model<IMailPreferenceEvent>('MailPreferenceEvent', mailPreferenceEventSchema);
