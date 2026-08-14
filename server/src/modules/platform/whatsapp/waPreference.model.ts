import mongoose, { Schema, type Types } from 'mongoose';
import { WA_OPTIONAL_CATEGORIES } from './whatsapp.events';

/**
 * Who has switched WhatsApp off, keyed by the NUMBER rather than the account.
 *
 * Not a field on the user and not a category on `MailPreference`, for reasons
 * that are structural rather than stylistic:
 *  - `MailPreference` is keyed `email` unique, and a marketing blast can reach
 *    typed-in numbers that belong to no account at all — those people have no
 *    address to file an opt-out under, and they are exactly the ones who most
 *    need one;
 *  - channel and kind are different axes. "WhatsApp off, marketing email on" is
 *    a real preference, and a `'whatsapp'` member inside `opted_out` cannot
 *    express it;
 *  - Meta enforces consent per phone number, which is what this collection is.
 *
 * Only opt-OUTs are stored. An absent document means opted in, which keeps the
 * send-path lookup to a single indexed read.
 */
export interface IWaPreference {
  _id: Types.ObjectId;
  /** Digits-only country code + number — exactly what `destinationFor` returns. */
  destination: string;
  user_id: Types.ObjectId | null;
  opted_out: string[];
  created_at: Date;
  updated_at: Date;
}

const waPreferenceSchema = new Schema<IWaPreference>(
  {
    destination: { type: String, required: true, unique: true, trim: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    opted_out: { type: [String], default: [], enum: WA_OPTIONAL_CATEGORIES as unknown as string[] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const WaPreferenceModel =
  (mongoose.models.WaPreference as mongoose.Model<IWaPreference>) ||
  mongoose.model<IWaPreference>('WaPreference', waPreferenceSchema);

/**
 * Every switch a person flipped, kept forever.
 *
 * A current-state-only model throws away the answer to "when did they opt out,
 * and from which screen" the moment they opt back in — the same reason
 * `MailPreferenceEvent` exists.
 */
export interface IWaPreferenceEvent {
  _id: Types.ObjectId;
  destination: string;
  user_id: Types.ObjectId | null;
  category: string;
  /** true = switched back on. */
  enabled: boolean;
  created_at: Date;
}

const waPreferenceEventSchema = new Schema<IWaPreferenceEvent>(
  {
    destination: { type: String, required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    category: { type: String, required: true, index: true },
    enabled: { type: Boolean, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

waPreferenceEventSchema.index({ created_at: -1 });

export const WaPreferenceEventModel =
  (mongoose.models.WaPreferenceEvent as mongoose.Model<IWaPreferenceEvent>) ||
  mongoose.model<IWaPreferenceEvent>('WaPreferenceEvent', waPreferenceEventSchema);
