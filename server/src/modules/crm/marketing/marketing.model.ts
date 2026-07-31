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
  /** Total pixel loads and tracked-link follows. Totals, not headcounts:
   * campaigns go out BCC'd in batches, so there is no per-recipient copy to
   * attribute an open to. */
  open_count: number;
  click_count: number;
  /** Every http(s) link the sent email carried, in the order the tracking
   * redirect indexes them. The redirect resolves against this and nothing
   * else, so it can never be pointed at an arbitrary destination. */
  tracked_links: string[];
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
    click_count: { type: Number, default: 0, min: 0 },
    tracked_links: { type: [String], default: [] },
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