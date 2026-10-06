import { Schema } from 'mongoose';

/**
 * What a GrapesJS editor produces, stored twice on every page and fragment:
 * the DRAFT the editor saves into, and the PUBLISHED copy the live site reads.
 * Saving never touches the live copy; publishing copies draft → published and
 * snapshots it into `cms_versions` for rollback.
 *
 * `project` is the editor's own JSON (components, styles, assets), kept as a
 * string so it round-trips exactly; `html`/`css` are what it rendered, and
 * `js` is the page's or component's own script. `css` is the visual editor's;
 * `scss` is code written by hand (the Code view). Both compile as SCSS when
 * rendered — a component's scoped to it — see cmsCode.service.ts.
 */
export interface CmsDraft {
  project: string;
  html: string;
  css: string;
  scss: string;
  js: string;
}

export interface CmsPublished {
  html: string;
  css: string;
  scss: string;
  js: string;
  version: number;
  published_at: Date | null;
  published_by: string;
}

export const draftSchema = new Schema<CmsDraft>(
  {
    project: { type: String, default: '' },
    html: { type: String, default: '' },
    css: { type: String, default: '' },
    scss: { type: String, default: '' },
    js: { type: String, default: '' },
  },
  { _id: false }
);

export const publishedSchema = new Schema<CmsPublished>(
  {
    html: { type: String, default: '' },
    css: { type: String, default: '' },
    scss: { type: String, default: '' },
    js: { type: String, default: '' },
    version: { type: Number, default: 0 },
    published_at: { type: Date, default: null },
    published_by: { type: String, default: '' },
  },
  { _id: false }
);

export const CMS_TWITTER_CARDS = ['', 'summary', 'summary_large_image'] as const;
export type CmsTwitterCard = (typeof CMS_TWITTER_CARDS)[number];

/** One extra <meta>: `name` for name= tags, or a property like og:locale. */
export interface CmsMetaTag {
  name: string;
  content: string;
}

export interface CmsSeo {
  title: string;
  description: string;
  og_image_url: string;
  canonical_url: string;
  noindex: boolean;
  /** The share card's own title and text, when they should differ from the page's. */
  og_title: string;
  og_description: string;
  /** '' lets the page decide (a wide card when it has its own image). */
  twitter_card: CmsTwitterCard;
  keywords: string;
  /** Structured data (schema.org), as JSON. */
  json_ld: string;
  meta_tags: CmsMetaTag[];
}

const metaTagSchema = new Schema<CmsMetaTag>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    content: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { _id: false }
);

/** The share card, keywords, structured data and extra tags — on a page, an entry, and a site (as their defaults). */
export const SEO_SHARING_FIELDS = {
  og_title: { type: String, default: '', trim: true, maxlength: 160 },
  og_description: { type: String, default: '', trim: true, maxlength: 320 },
  twitter_card: { type: String, enum: CMS_TWITTER_CARDS, default: '' as const },
  keywords: { type: String, default: '', trim: true, maxlength: 300 },
  json_ld: { type: String, default: '', maxlength: 20000 },
  meta_tags: { type: [metaTagSchema], default: [] },
};

export const seoSchema = new Schema<CmsSeo>(
  {
    title: { type: String, default: '', trim: true, maxlength: 160 },
    description: { type: String, default: '', trim: true, maxlength: 320 },
    og_image_url: { type: String, default: '', trim: true, maxlength: 1000 },
    canonical_url: { type: String, default: '', trim: true, maxlength: 1000 },
    noindex: { type: Boolean, default: false },
    ...SEO_SHARING_FIELDS,
  },
  { _id: false }
);
