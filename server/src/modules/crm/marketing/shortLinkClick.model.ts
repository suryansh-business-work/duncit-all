import { Schema, model, type Document, type Types } from 'mongoose';
import type { DeviceType } from './shortLink.analytics';

/**
 * One row per click on a short link.
 *
 * Kept separate from the counter on ShortLink on purpose: the counter answers
 * "how many" in one indexed read for the table, and this answers "who, from
 * where, on what" without making every list query pay for it.
 */
export interface IShortLinkClick extends Document {
  _id: Types.ObjectId;
  /** Stable id handed to the destination as `dlc`, so a later signup or
   * payment can be traced back to this exact click. */
  click_id: string;
  code: string;
  short_link_id: Types.ObjectId;
  clicked_at: Date;
  /** Where the visitor came from, resolved to a product name. */
  platform: string;
  referrer_host?: string | null;
  referrer_url?: string | null;
  device_type: DeviceType;
  os: string;
  browser: string;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  /**
   * SHA-256 of the address, never the address itself. Enough to count a
   * returning visitor, useless for identifying a person.
   */
  ip_hash?: string | null;
  user_agent?: string | null;
  /** Filled in later, when the visit is tied to an account. */
  user_id?: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const shortLinkClickSchema = new Schema<IShortLinkClick>(
  {
    click_id: { type: String, required: true, unique: true },
    code: { type: String, required: true, index: true },
    short_link_id: { type: Schema.Types.ObjectId, required: true, index: true },
    clicked_at: { type: Date, required: true, index: true },
    platform: { type: String, required: true, index: true },
    referrer_host: { type: String, default: null },
    referrer_url: { type: String, default: null },
    device_type: { type: String, required: true, index: true },
    os: { type: String, required: true },
    browser: { type: String, required: true },
    country: { type: String, default: null, index: true },
    region: { type: String, default: null },
    city: { type: String, default: null },
    ip_hash: { type: String, default: null, index: true },
    user_agent: { type: String, default: null },
    user_id: { type: Schema.Types.ObjectId, default: null, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The detail page always reads one link's clicks newest-first.
shortLinkClickSchema.index({ short_link_id: 1, clicked_at: -1 });

export const ShortLinkClickModel = model<IShortLinkClick>('ShortLinkClick', shortLinkClickSchema);
