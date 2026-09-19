import { Schema, model, type Document } from 'mongoose';

/**
 * One of the pet store's own pages beyond the four built-in policies that live
 * on the settings document (shipping, returns, terms, about): a size guide, a
 * delivery FAQ, a brand story. Written in the ecomm portal, read at
 * ecomm.duncit.com/pages/<slug>, and linked from the footer when it says so.
 */
export interface IStorePage extends Document {
  title: string;
  slug: string;
  content_html: string;
  show_in_footer: boolean;
  is_active: boolean;
  sort_order: number;
  seo_title: string;
  seo_description: string;
  created_at: Date;
  updated_at: Date;
}

const storePageSchema = new Schema<IStorePage>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 120 },
    content_html: { type: String, default: '', maxlength: 100000 },
    show_in_footer: { type: Boolean, default: true },
    is_active: { type: Boolean, default: true, index: true },
    sort_order: { type: Number, default: 0 },
    seo_title: { type: String, default: '', trim: true, maxlength: 160 },
    seo_description: { type: String, default: '', trim: true, maxlength: 320 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'store_pages' }
);

export const StorePageModel = model<IStorePage>('StorePage', storePageSchema);
