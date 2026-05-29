import { Schema, model, type Document } from 'mongoose';

export type MarketingCampaignChannel = 'EMAIL' | 'WHATSAPP';
export type MarketingCampaignAudience = 'ALL_USERS' | 'NEWSLETTER_SUBSCRIBERS';
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
  subject: string;
  mjml: string;
  rendered_html?: string | null;
  card?: IMarketingCampaignCard | null;
  scheduled_at?: Date | null;
  sent_at?: Date | null;
  status: MarketingCampaignStatus;
  recipient_count: number;
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
    channel: { type: String, enum: ['EMAIL', 'WHATSAPP'], required: true },
    audience: {
      type: String,
      enum: ['ALL_USERS', 'NEWSLETTER_SUBSCRIBERS'],
      required: true,
    },
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