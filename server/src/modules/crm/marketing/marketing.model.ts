import { Schema, model, type Document, type Types } from 'mongoose';

/** Email is the only channel. WhatsApp campaigns were removed outright —
 * see scripts/migrate-drop-whatsapp-campaigns.ts for the stored rows. */
export type MarketingCampaignChannel = 'EMAIL';
export type MarketingCampaignAudience =
  | 'ALL_USERS'
  | 'NEWSLETTER_SUBSCRIBERS'
  | 'AUDIENCE_LIST';
export type MarketingCampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';
export type MarketingCampaignCardType = 'POD' | 'CLUB';

/** A CTA is a link MJML rendered as a button; UNSUBSCRIBE is an opt-out, kept
 * apart so it never reads as ordinary engagement. */
export type TrackedLinkKind = 'LINK' | 'CTA' | 'UNSUBSCRIBE';

export interface ITrackedLink {
  url: string;
  kind: TrackedLinkKind;
  click_count: number;
}

export interface ITrackedImage {
  url: string;
  load_count: number;
}

/** What the SMTP server said at handover. This is acceptance, not inbox
 * delivery — a mailbox that accepts then bounces is invisible from here. */
export interface ICampaignDelivery {
  accepted: number;
  rejected: number;
  rejected_addresses: string[];
}

export interface IMarketingCampaignCard {
  type: MarketingCampaignCardType | null;
  ref_id?: string | null;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  cta_url?: string | null;
}

export interface IMarketingCampaign extends Document {
  campaign_id: string;
  name: string;
  channel: MarketingCampaignChannel;
  audience: MarketingCampaignAudience;
  audience_list_id?: Types.ObjectId | null;
  subject: string;
  mjml: string;
  rendered_html?: string | null;
  card?: IMarketingCampaignCard | null;
  scheduled_at?: Date | null;
  sent_at?: Date | null;
  status: MarketingCampaignStatus;
  recipient_count: number;
  /** Totals, not headcounts: campaigns go out BCC'd in batches, so there is
   * no per-recipient copy to attribute an open to. */
  open_count: number;
  image_load_count: number;
  click_count: number;
  first_opened_at?: Date | null;
  last_opened_at?: Date | null;
  /** Every link and remote image the sent email carried, in the order the
   * tracking redirects index them. The redirects resolve against these and
   * nothing else, so neither can be pointed at an arbitrary destination. */
  tracked_links: ITrackedLink[];
  tracked_images: ITrackedImage[];
  delivery?: ICampaignDelivery | null;
  error?: string | null;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

const cardSchema = new Schema<IMarketingCampaignCard>(
  {
    type: { type: String, enum: ['POD', 'CLUB'], default: null },
    ref_id: { type: String, default: null, trim: true },
    title: { type: String, default: null, trim: true },
    description: { type: String, default: null, trim: true },
    image_url: { type: String, default: null, trim: true },
    cta_url: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const trackedLinkSchema = new Schema<ITrackedLink>(
  {
    url: { type: String, required: true },
    kind: { type: String, enum: ['LINK', 'CTA', 'UNSUBSCRIBE'], default: 'LINK' },
    click_count: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const trackedImageSchema = new Schema<ITrackedImage>(
  {
    url: { type: String, required: true },
    load_count: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const deliverySchema = new Schema<ICampaignDelivery>(
  {
    accepted: { type: Number, default: 0, min: 0 },
    rejected: { type: Number, default: 0, min: 0 },
    rejected_addresses: { type: [String], default: [] },
  },
  { _id: false }
);

const marketingCampaignSchema = new Schema<IMarketingCampaign>(
  {
    campaign_id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    channel: { type: String, enum: ['EMAIL'], required: true, default: 'EMAIL' },
    audience: {
      type: String,
      enum: ['ALL_USERS', 'NEWSLETTER_SUBSCRIBERS', 'AUDIENCE_LIST'],
      required: true,
    },
    /** AUDIENCE_LIST audience only: the saved list to send to. Its members are
     * recomputed at send time, never frozen onto the campaign. */
    audience_list_id: { type: Schema.Types.ObjectId, ref: 'AudienceList', default: null },
    subject: { type: String, required: true, trim: true, maxlength: 180 },
    mjml: { type: String, required: true },
    rendered_html: { type: String, default: null },
    card: { type: cardSchema, default: null },
    scheduled_at: { type: Date, default: null, index: true },
    sent_at: { type: Date, default: null },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED'],
      default: 'DRAFT',
      index: true,
    },
    recipient_count: { type: Number, default: 0, min: 0 },
    open_count: { type: Number, default: 0, min: 0 },
    image_load_count: { type: Number, default: 0, min: 0 },
    click_count: { type: Number, default: 0, min: 0 },
    first_opened_at: { type: Date, default: null },
    last_opened_at: { type: Date, default: null },
    tracked_links: { type: [trackedLinkSchema], default: [] },
    tracked_images: { type: [trackedImageSchema], default: [] },
    delivery: { type: deliverySchema, default: null },
    error: { type: String, default: null },
    created_by: { type: String, default: null, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

marketingCampaignSchema.index({ status: 1, scheduled_at: 1 });

export const MarketingCampaignModel = model<IMarketingCampaign>(
  'MarketingCampaign',
  marketingCampaignSchema
);