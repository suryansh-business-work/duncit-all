import { Schema, model, Types, type Document } from 'mongoose';
import {
  DEFAULT_SMART_INCENTIVE_DELAY_SECONDS,
  DEFAULT_SMART_INCENTIVE_MAX_PCT,
  SMART_INCENTIVE_DELAY_MAX_SECONDS,
  SMART_INCENTIVE_DELAY_MIN_SECONDS,
  SMART_INCENTIVE_MAX_PCT_CEILING,
} from './smartIncentive.rules';

/**
 * Loyalty > Smart Incentive > Settings. One document, like the coin and
 * referral programmes, and out of AppSettings for the same reason: it is money
 * policy run from the Loyalty console, whose seats cannot write AppSettings.
 */
export interface ISmartIncentiveSettings extends Document {
  singleton_key: string;
  /** The programme's switch. Off: no pod page offers anything and checkout applies no unlocked offer. */
  enabled: boolean;
  /** Seconds a member stays on a pod page before the offer shows. */
  delay_seconds: number;
  /** The biggest discount a host may choose. Pods already above a lowered ceiling keep theirs until edited. */
  max_discount_pct: number;
  created_at: Date;
  updated_at: Date;
}

const settingsSchema = new Schema<ISmartIncentiveSettings>(
  {
    singleton_key: { type: String, default: 'smart_incentive', unique: true },
    enabled: { type: Boolean, default: true },
    delay_seconds: {
      type: Number,
      default: DEFAULT_SMART_INCENTIVE_DELAY_SECONDS,
      min: SMART_INCENTIVE_DELAY_MIN_SECONDS,
      max: SMART_INCENTIVE_DELAY_MAX_SECONDS,
    },
    max_discount_pct: {
      type: Number,
      default: DEFAULT_SMART_INCENTIVE_MAX_PCT,
      min: 1,
      max: SMART_INCENTIVE_MAX_PCT_CEILING,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

/**
 * One member's unlocked offer on one pod: the popup was shown, and the
 * percentage it promised is frozen here so a later change to the pod cannot
 * rewrite it. Whether it still APPLIES is decided at checkout — only while the
 * programme is on and the pod still offers the incentive.
 */
export interface ISmartIncentiveOffer extends Document {
  user_id: Types.ObjectId;
  pod_id: Types.ObjectId;
  discount_pct: number;
  created_at: Date;
  updated_at: Date;
}

const offerSchema = new Schema<ISmartIncentiveOffer>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true },
    discount_pct: { type: Number, required: true, min: 1, max: SMART_INCENTIVE_MAX_PCT_CEILING },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One offer per member per pod: unlocking is an upsert, so a second popup (or
// two racing tabs) can never mint a second, different promise.
offerSchema.index({ user_id: 1, pod_id: 1 }, { unique: true });
// The dashboard's month-by-month series.
offerSchema.index({ created_at: -1 });

export const SmartIncentiveSettingsModel = model<ISmartIncentiveSettings>('SmartIncentiveSettings', settingsSchema);
export const SmartIncentiveOfferModel = model<ISmartIncentiveOffer>('SmartIncentiveOffer', offerSchema);
