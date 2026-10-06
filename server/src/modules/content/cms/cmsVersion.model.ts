import { Schema, model, type Document, type Types } from 'mongoose';

export const CMS_VERSION_OWNERS = ['PAGE', 'FRAGMENT'] as const;
export type CmsVersionOwner = (typeof CMS_VERSION_OWNERS)[number];

/** A snapshot taken at every publish, so a bad publish is one click to undo. */
export interface ICmsVersion extends Document {
  owner_kind: CmsVersionOwner;
  owner_id: Types.ObjectId;
  site_id: Types.ObjectId;
  version: number;
  project: string;
  html: string;
  css: string;
  published_by: string;
  created_at: Date;
}

const cmsVersionSchema = new Schema<ICmsVersion>(
  {
    owner_kind: { type: String, enum: CMS_VERSION_OWNERS, required: true },
    owner_id: { type: Schema.Types.ObjectId, required: true },
    site_id: { type: Schema.Types.ObjectId, ref: 'CmsSite', required: true, index: true },
    version: { type: Number, required: true },
    project: { type: String, default: '' },
    html: { type: String, default: '' },
    css: { type: String, default: '' },
    published_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, collection: 'cms_versions' }
);

cmsVersionSchema.index({ owner_kind: 1, owner_id: 1, version: -1 }, { unique: true });

export const CmsVersionModel = model<ICmsVersion>('CmsVersion', cmsVersionSchema);
