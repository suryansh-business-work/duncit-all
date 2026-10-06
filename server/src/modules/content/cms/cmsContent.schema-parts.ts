import { Schema } from 'mongoose';

/**
 * What a GrapesJS editor produces, stored twice on every page and fragment:
 * the DRAFT the editor saves into, and the PUBLISHED copy the live site reads.
 * Saving never touches the live copy; publishing copies draft → published and
 * snapshots it into `cms_versions` for rollback.
 *
 * `project` is the editor's own JSON (components, styles, assets), kept as a
 * string so it round-trips exactly; `html`/`css` are what it rendered.
 */
export interface CmsDraft {
  project: string;
  html: string;
  css: string;
}

export interface CmsPublished {
  html: string;
  css: string;
  version: number;
  published_at: Date | null;
  published_by: string;
}

export const draftSchema = new Schema<CmsDraft>(
  {
    project: { type: String, default: '' },
    html: { type: String, default: '' },
    css: { type: String, default: '' },
  },
  { _id: false }
);

export const publishedSchema = new Schema<CmsPublished>(
  {
    html: { type: String, default: '' },
    css: { type: String, default: '' },
    version: { type: Number, default: 0 },
    published_at: { type: Date, default: null },
    published_by: { type: String, default: '' },
  },
  { _id: false }
);

export interface CmsSeo {
  title: string;
  description: string;
  og_image_url: string;
  canonical_url: string;
  noindex: boolean;
}

export const seoSchema = new Schema<CmsSeo>(
  {
    title: { type: String, default: '', trim: true, maxlength: 160 },
    description: { type: String, default: '', trim: true, maxlength: 320 },
    og_image_url: { type: String, default: '', trim: true, maxlength: 1000 },
    canonical_url: { type: String, default: '', trim: true, maxlength: 1000 },
    noindex: { type: Boolean, default: false },
  },
  { _id: false }
);
