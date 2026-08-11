import { Schema, model, models, type Model, Types } from 'mongoose';

/** One user's shareable referral code (generated lazily on first read). */
export interface IReferralCode {
  user_id: Types.ObjectId;
  code: string;
  created_at: Date;
}

const referralCodeSchema = new Schema<IReferralCode>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const ReferralCodeModel: Model<IReferralCode> =
  (models.ReferralCode as Model<IReferralCode>) ??
  model<IReferralCode>('ReferralCode', referralCodeSchema);

/** Who referred whom — one row per redeemed code (a user can be referred once). */
export interface IReferral {
  referrer_user_id: Types.ObjectId;
  referred_user_id: Types.ObjectId;
  code: string;
  created_at: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    referrer_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referred_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    code: { type: String, required: true, uppercase: true, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const ReferralModel: Model<IReferral> =
  (models.Referral as Model<IReferral>) ?? model<IReferral>('Referral', referralSchema);

/** Finance-managed referral settings (singleton) — what a referral pays and
 * what gets said when a member shares their code. */
export interface IReferralSettings {
  singleton_key: string;
  gift_description: string;
  /** The message a share sheet pre-fills. See DEFAULT_REFERRAL_MESSAGE for the
   * placeholders it may use. */
  share_message: string;
}

const referralSettingsSchema = new Schema<IReferralSettings>({
  singleton_key: { type: String, default: 'referral', unique: true },
  gift_description: { type: String, default: '' },
  // `coins_per_referral` used to live here. It moved to CoinSettings, where the
  // rest of the coin payout rules are; coinSettingsService.seed() carries the
  // configured value across on first boot after the move.
  // Stored empty rather than seeded with the default text: an empty column is
  // "Finance has not written one", which the apps answer with the shipped
  // default. Copying the default in would freeze today's wording into the
  // database, where a later change to it could never reach.
  share_message: { type: String, default: '', maxlength: 500 },
});

export const ReferralSettingsModel: Model<IReferralSettings> =
  (models.ReferralSettings as Model<IReferralSettings>) ??
  model<IReferralSettings>('ReferralSettings', referralSettingsSchema);
