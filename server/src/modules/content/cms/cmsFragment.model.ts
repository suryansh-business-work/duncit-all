import { Schema, model, type Document, type Types } from 'mongoose';
import { CMS_FRAGMENT_KINDS, type CmsFragmentKind } from './cms.constants';
import { draftSchema, publishedSchema, type CmsDraft, type CmsPublished } from './cmsContent.schema-parts';

/**
 * A reusable piece of a site, designed once and used everywhere: the HEADER and
 * FOOTER every page is wrapped in, and SECTIONs dragged into pages as a block.
 * A page holds a reference (`<duncit-fragment data-key="…">`), never a copy, so
 * publishing a fragment changes every page that uses it.
 */
export interface ICmsFragment extends Document {
  site_id: Types.ObjectId;
  key: string;
  name: string;
  kind: CmsFragmentKind;
  draft: CmsDraft;
  published: CmsPublished;
  is_published: boolean;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

const cmsFragmentSchema = new Schema<ICmsFragment>(
  {
    site_id: { type: Schema.Types.ObjectId, ref: 'CmsSite', required: true, index: true },
    key: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    kind: { type: String, enum: CMS_FRAGMENT_KINDS, default: 'SECTION' },
    draft: { type: draftSchema, default: () => ({}) },
    published: { type: publishedSchema, default: () => ({}) },
    is_published: { type: Boolean, default: false },
    updated_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'cms_fragments' }
);

cmsFragmentSchema.index({ site_id: 1, key: 1 }, { unique: true });

export const CmsFragmentModel = model<ICmsFragment>('CmsFragment', cmsFragmentSchema);
