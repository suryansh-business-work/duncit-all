import { Schema, model, type Document, type Types } from 'mongoose';
import { CMS_COLLECTIONS, type CmsCollection } from './cms.constants';
import { seoSchema, type CmsSeo } from './cmsContent.schema-parts';

/** A collection-specific field — a career's location, a case study's client. */
export interface CmsEntryField {
  key: string;
  value: string;
}

/**
 * One item in a site's collection: a blog post, a job opening, a newsletter
 * issue, a case study or a press item. Written in a form (rich text), not in
 * GrapesJS — the collection's list/detail templates decide how it looks.
 */
export interface ICmsEntry extends Document {
  site_id: Types.ObjectId;
  collection_type: CmsCollection;
  title: string;
  slug: string;
  summary: string;
  body_html: string;
  cover_image_url: string;
  category: string;
  tags: string[];
  author_name: string;
  fields: CmsEntryField[];
  seo: CmsSeo;
  is_published: boolean;
  published_at: Date | null;
  sort_order: number;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

const cmsEntrySchema = new Schema<ICmsEntry>(
  {
    site_id: { type: Schema.Types.ObjectId, ref: 'CmsSite', required: true },
    collection_type: { type: String, enum: CMS_COLLECTIONS, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    summary: { type: String, default: '', trim: true, maxlength: 600 },
    body_html: { type: String, default: '' },
    cover_image_url: { type: String, default: '', trim: true, maxlength: 1000 },
    category: { type: String, default: '', trim: true, maxlength: 80 },
    tags: { type: [String], default: [] },
    author_name: { type: String, default: '', trim: true, maxlength: 120 },
    fields: {
      type: [
        new Schema<CmsEntryField>(
          {
            key: { type: String, required: true, trim: true, maxlength: 60 },
            value: { type: String, default: '', trim: true, maxlength: 1000 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    seo: { type: seoSchema, default: () => ({}) },
    is_published: { type: Boolean, default: false },
    published_at: { type: Date, default: null },
    sort_order: { type: Number, default: 0 },
    updated_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'cms_entries' }
);

cmsEntrySchema.index({ site_id: 1, collection_type: 1, slug: 1 }, { unique: true });
// The public list: a site's published entries of one collection, newest first.
cmsEntrySchema.index({ site_id: 1, collection_type: 1, is_published: 1, published_at: -1 });

export const CmsEntryModel = model<ICmsEntry>('CmsEntry', cmsEntrySchema);
