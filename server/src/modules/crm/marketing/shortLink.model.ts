import { Schema, model, type Document, type Types } from 'mongoose';
import type { ShareLinkTarget } from './shortLink.share';

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
  /** Set when the link was minted for something a member shared out of mWeb
   * or the app, rather than typed into the marketing console. */
  share_target?: ShareLinkTarget | null;
  /**
   * The thing that was shared, as target:ref. Unique, and that uniqueness is
   * the feature: one link per pod, per club, per profile, however many people
   * share it and however often. Without it the table would grow a row per tap
   * and no link would carry a meaningful click count.
   */
  share_key?: string | null;
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
    share_target: { type: String, default: null },
    // No default: an absent path is what keeps every hand-made link out of
    // the unique index below, which a stored null would not.
    share_key: { type: String },
    is_active: { type: Boolean, default: true, index: true },
    click_count: { type: Number, default: 0, min: 0 },
    first_clicked_at: { type: Date, default: null },
    last_clicked_at: { type: Date, default: null },
    created_by: { type: String, default: null, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Partial rather than sparse: the share key is what makes a share link one
// per thing, and two people sharing the same pod in the same second must
// collide here rather than each get their own link.
shortLinkSchema.index(
  { share_key: 1 },
  { unique: true, partialFilterExpression: { share_key: { $type: 'string' } } },
);

export const ShortLinkModel = model<IShortLink>('ShortLink', shortLinkSchema);
