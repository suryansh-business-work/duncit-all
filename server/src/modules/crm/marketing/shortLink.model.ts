import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * Where a link is being handed out. Becomes `utm_source`.
 * OTHER carries free text in `source_other`.
 */
export const SHORT_LINK_SOURCES = [
  'DIRECT_LINK_SHARE',
  'INSTAGRAM',
  'FACEBOOK',
  'THREADS',
  'WHATSAPP',
  'X_TWITTER',
  'LINKEDIN',
  'YOUTUBE',
  'TELEGRAM',
  'EMAIL',
  'SMS',
  'GOOGLE_SEARCH',
  'GOOGLE_ADS',
  'QR_CODE',
  'REDDIT',
  'DISCORD',
  'INFLUENCER',
  'AFFILIATE',
  'REFERRAL_PARTNER',
  'OTHER',
] as const;

/** How the traffic arrives. Becomes `utm_medium`. */
export const SHORT_LINK_MEDIUMS = [
  'SOCIAL',
  'ORGANIC_SOCIAL',
  'PAID_SOCIAL',
  'EMAIL',
  'MESSAGING',
  'CPC',
  'DISPLAY',
  'SEARCH',
  'ORGANIC_SEARCH',
  'REFERRAL',
  'AFFILIATE',
  'INFLUENCER',
  'QR_CODE',
  'PUSH_NOTIFICATION',
  'SMS',
  'BANNER',
  'VIDEO',
  'DISPLAY_AD',
  'IN_APP',
  'DIRECT',
  'OTHER',
] as const;

export type ShortLinkSource = (typeof SHORT_LINK_SOURCES)[number];
export type ShortLinkMedium = (typeof SHORT_LINK_MEDIUMS)[number];

export interface IShortLink extends Document {
  _id: Types.ObjectId;
  /** The bit after duncit.com/. Exactly 8 base62 chars, always containing at
   * least one digit and one uppercase letter — see shortLink.service.ts for
   * why that shape is load-bearing rather than cosmetic. */
  code: string;
  label: string;
  destination_url: string;
  source: ShortLinkSource;
  source_other?: string | null;
  medium: ShortLinkMedium;
  medium_other?: string | null;
  /** Optional marketing campaign this link belongs to. */
  campaign_id?: string | null;
  /**
   * The utm values FROZEN at creation. Deriving them at redirect time would
   * mean a renamed campaign silently changed the tagging of links already
   * printed on posters.
   */
  utm_source: string;
  utm_medium: string;
  utm_campaign?: string | null;
  is_active: boolean;
  click_count: number;
  first_clicked_at?: Date | null;
  last_clicked_at?: Date | null;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

const shortLinkSchema = new Schema<IShortLink>(
  {
    code: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    destination_url: { type: String, required: true, trim: true },
    source: { type: String, enum: SHORT_LINK_SOURCES, required: true },
    source_other: { type: String, default: null, trim: true, maxlength: 60 },
    medium: { type: String, enum: SHORT_LINK_MEDIUMS, required: true },
    medium_other: { type: String, default: null, trim: true, maxlength: 60 },
    campaign_id: { type: String, default: null, index: true },
    utm_source: { type: String, required: true },
    utm_medium: { type: String, required: true },
    utm_campaign: { type: String, default: null },
    is_active: { type: Boolean, default: true, index: true },
    click_count: { type: Number, default: 0, min: 0 },
    first_clicked_at: { type: Date, default: null },
    last_clicked_at: { type: Date, default: null },
    created_by: { type: String, default: null, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ShortLinkModel = model<IShortLink>('ShortLink', shortLinkSchema);
