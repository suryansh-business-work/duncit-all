import { Schema, model, type Document, type Types } from 'mongoose';
import { CMS_COLLECTIONS, CMS_PAGE_KINDS, type CmsCollection, type CmsPageKind } from './cms.constants';
import { draftSchema, publishedSchema, seoSchema, type CmsDraft, type CmsPublished, type CmsSeo } from './cmsContent.schema-parts';

/**
 * A page of a CMS site, designed in GrapesJS.
 *
 * `PAGE` is served at `path`. `COLLECTION_LIST` / `COLLECTION_DETAIL` are the
 * templates a collection (Blog, Careers, …) renders its index and its entries
 * through; they have no path of their own — the collection's path decides.
 */
export interface ICmsPage extends Document {
  site_id: Types.ObjectId;
  kind: CmsPageKind;
  collection_type: CmsCollection | null;
  title: string;
  path: string;
  draft: CmsDraft;
  published: CmsPublished;
  is_published: boolean;
  seo: CmsSeo;
  show_header: boolean;
  show_footer: boolean;
  head_html: string;
  custom_css: string;
  custom_js: string;
  sort_order: number;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

const cmsPageSchema = new Schema<ICmsPage>(
  {
    site_id: { type: Schema.Types.ObjectId, ref: 'CmsSite', required: true, index: true },
    kind: { type: String, enum: CMS_PAGE_KINDS, default: 'PAGE' },
    collection_type: { type: String, enum: [...CMS_COLLECTIONS, null], default: null },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    path: { type: String, default: '', trim: true, maxlength: 300 },
    draft: { type: draftSchema, default: () => ({}) },
    published: { type: publishedSchema, default: () => ({}) },
    is_published: { type: Boolean, default: false },
    seo: { type: seoSchema, default: () => ({}) },
    show_header: { type: Boolean, default: true },
    show_footer: { type: Boolean, default: true },
    head_html: { type: String, default: '' },
    custom_css: { type: String, default: '' },
    custom_js: { type: String, default: '' },
    sort_order: { type: Number, default: 0 },
    updated_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'cms_pages' }
);

// One page per address, and one list + one detail template per collection.
cmsPageSchema.index(
  { site_id: 1, path: 1 },
  { unique: true, partialFilterExpression: { kind: 'PAGE' } }
);
cmsPageSchema.index(
  { site_id: 1, kind: 1, collection_type: 1 },
  { unique: true, partialFilterExpression: { kind: { $in: ['COLLECTION_LIST', 'COLLECTION_DETAIL'] } } }
);

export const CmsPageModel = model<ICmsPage>('CmsPage', cmsPageSchema);
