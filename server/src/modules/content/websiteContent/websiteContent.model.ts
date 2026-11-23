import { Schema, model, type Document } from 'mongoose';

export const WEBSITE_PAGE_TYPES = ['CAREERS', 'NEWSROOM', 'BLOG', 'SOLUTIONS'] as const;
export type WebsitePageType = (typeof WEBSITE_PAGE_TYPES)[number];

/**
 * Who a SOLUTIONS entry is offered to — the sections duncit.com/solutions lists,
 * in this order. Blank on every other page type.
 */
export const SOLUTION_AUDIENCES = ['VENUE', 'HOST', 'CLUB_ADMIN', 'CREATOR', 'COMMUNITY'] as const;
export type SolutionAudience = (typeof SOLUTION_AUDIENCES)[number];

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
  /** SOLUTIONS only: who it is for; '' on every other type. */
  audience: SolutionAudience | '';
  /** SOLUTIONS only: announced, not on sale yet — the listing marks it. */
  coming_soon: boolean;
  created_at: Date;
  updated_at: Date;
}

const websiteContentSchema = new Schema<IWebsiteContent>(
  {
    type: { type: String, enum: WEBSITE_PAGE_TYPES, required: true, index: true },
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
    audience: { type: String, enum: [...SOLUTION_AUDIENCES, ''], default: '' },
    coming_soon: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

websiteContentSchema.index({ type: 1, slug: 1 }, { unique: true });

export const WebsiteContentModel = model<IWebsiteContent>('WebsiteContent', websiteContentSchema);