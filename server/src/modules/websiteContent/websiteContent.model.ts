import { Schema, model, type Document } from 'mongoose';

export type WebsitePageType = 'CAREERS' | 'NEWSROOM' | 'BLOG';

export interface IWebsiteContent extends Document {
  type: WebsitePageType;
  title: string;
  slug: string;
  summary: string;
  body: string;
  category: string;
  image_url: string;
  cta_label: string;
  cta_url: string;
  published_at: Date | null;
  is_published: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

const websiteContentSchema = new Schema<IWebsiteContent>(
  {
    type: { type: String, enum: ['CAREERS', 'NEWSROOM', 'BLOG'], required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    summary: { type: String, default: '', trim: true },
    body: { type: String, default: '' },
    category: { type: String, default: '', trim: true },
    image_url: { type: String, default: '', trim: true },
    cta_label: { type: String, default: '', trim: true },
    cta_url: { type: String, default: '', trim: true },
    published_at: { type: Date, default: null },
    is_published: { type: Boolean, default: true, index: true },
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

websiteContentSchema.index({ type: 1, slug: 1 }, { unique: true });

export const WebsiteContentModel = model<IWebsiteContent>('WebsiteContent', websiteContentSchema);