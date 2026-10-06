import { Schema, model, type Document, type Types } from 'mongoose';

export const CMS_SITE_SECTIONS = ['SETTINGS', 'DESIGN', 'CODE'] as const;
export type CmsSiteSection = (typeof CMS_SITE_SECTIONS)[number];

/**
 * One saved state of a website's own settings, design system or site code —
 * taken at every save, so any earlier state is one click to bring back.
 * Pages and fragments keep their own history in `cms_versions`.
 */
export interface ICmsSiteRevision extends Document {
  site_id: Types.ObjectId;
  revision: number;
  section: CmsSiteSection;
  /** The section exactly as saved, as JSON — replayed through the same validated save on restore. */
  data: string;
  /** The revision this one brought back, when it was a restore. */
  restored_from: number | null;
  saved_by: string;
  created_at: Date;
}

const cmsSiteRevisionSchema = new Schema<ICmsSiteRevision>(
  {
    site_id: { type: Schema.Types.ObjectId, ref: 'CmsSite', required: true },
    revision: { type: Number, required: true },
    section: { type: String, enum: CMS_SITE_SECTIONS, required: true },
    data: { type: String, required: true },
    restored_from: { type: Number, default: null },
    saved_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, collection: 'cms_site_revisions' }
);

// Numbers are per site; the unique index turns two simultaneous saves into a retry, never a duplicate.
cmsSiteRevisionSchema.index({ site_id: 1, revision: -1 }, { unique: true });
cmsSiteRevisionSchema.index({ site_id: 1, section: 1, revision: -1 });

export const CmsSiteRevisionModel = model<ICmsSiteRevision>('CmsSiteRevision', cmsSiteRevisionSchema);
