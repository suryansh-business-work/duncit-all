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

/** Admin-managed referral settings (singleton) — what gift referrers earn. */
export interface IReferralSettings {
  singleton_key: string;
  gift_description: string;
}

const referralSettingsSchema = new Schema<IReferralSettings>({
  singleton_key: { type: String, default: 'referral', unique: true },
  gift_description: { type: String, default: '' },
});

export const ReferralSettingsModel: Model<IReferralSettings> =
  (models.ReferralSettings as Model<IReferralSettings>) ??
  model<IReferralSettings>('ReferralSettings', referralSettingsSchema);
