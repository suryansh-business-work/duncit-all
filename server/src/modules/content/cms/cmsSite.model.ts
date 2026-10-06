import { Schema, model, type Document, type Types } from 'mongoose';
import { CMS_COLLECTIONS, CMS_LEGACY_SITES, type CmsCollection } from './cms.constants';

/** One design token, emitted as a CSS custom property on `:root`. */
export interface CmsToken {
  name: string;
  value: string;
  group: string;
}

export const CMS_FONT_SOURCES = ['GOOGLE', 'CUSTOM'] as const;
export const CMS_FONT_ROLES = ['HEADING', 'BODY', 'ACCENT', 'NONE'] as const;

/** One uploaded file of a custom font: a weight and style, and where it lives. */
export interface CmsFontFile {
  weight: number;
  style: 'normal' | 'italic';
  url: string;
}

/**
 * A typeface the site uses. A GOOGLE font is loaded from Google Fonts in the
 * weights chosen; a CUSTOM font is the site's own uploaded files. `role` binds
 * it to `--font-heading` / `--font-body` / `--font-accent`, and `variable`
 * can bind it to any other token too (a migrated site's `--font-display`).
 */
export interface CmsFont {
  family: string;
  source: (typeof CMS_FONT_SOURCES)[number];
  weights: number[];
  italic: boolean;
  role: (typeof CMS_FONT_ROLES)[number];
  variable: string;
  fallback: string;
  files: CmsFontFile[];
}

/**
 * A site's design system. Every site has its own: the tokens become CSS
 * variables, `font_urls` are stylesheet links (Google Fonts and the like) and
 * `base_css` is the site's own stylesheet — for a migrated site, the compiled
 * CSS it shipped with, so imported pages keep their look.
 */
export interface CmsDesign {
  tokens: CmsToken[];
  fonts: CmsFont[];
  font_urls: string[];
  base_css: string;
}

const fontSchema = new Schema<CmsFont>(
  {
    family: { type: String, required: true, trim: true, maxlength: 80 },
    source: { type: String, enum: CMS_FONT_SOURCES, required: true },
    weights: { type: [Number], default: [400] },
    italic: { type: Boolean, default: false },
    role: { type: String, enum: CMS_FONT_ROLES, default: 'NONE' },
    variable: { type: String, default: '', trim: true, maxlength: 64 },
    fallback: { type: String, default: 'sans-serif', trim: true, maxlength: 120 },
    files: {
      type: [
        new Schema<CmsFontFile>(
          {
            weight: { type: Number, required: true },
            style: { type: String, enum: ['normal', 'italic'], default: 'normal' },
            url: { type: String, required: true, trim: true, maxlength: 1000 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { _id: false }
);

export interface CmsCollectionPath {
  collection: CmsCollection;
  path: string;
}

export interface CmsSeoDefaults {
  title: string;
  description: string;
  og_image_url: string;
}

/** A website the CMS serves, picked by the request's hostname. */
export interface ICmsSite extends Document {
  key: string;
  name: string;
  domains: string[];
  legacy_site: (typeof CMS_LEGACY_SITES)[number] | null;
  is_active: boolean;
  design: CmsDesign;
  head_html: string;
  body_end_html: string;
  custom_css: string;
  custom_js: string;
  favicon_url: string;
  seo: CmsSeoDefaults;
  header_fragment_id: Types.ObjectId | null;
  footer_fragment_id: Types.ObjectId | null;
  collections: CmsCollection[];
  collection_paths: CmsCollectionPath[];
  created_at: Date;
  updated_at: Date;
}

const tokenSchema = new Schema<CmsToken>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    value: { type: String, required: true, trim: true, maxlength: 400 },
    group: { type: String, default: 'color', trim: true, maxlength: 40 },
  },
  { _id: false }
);

const cmsSiteSchema = new Schema<ICmsSite>(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 60 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    domains: { type: [String], default: [] },
    legacy_site: { type: String, enum: [...CMS_LEGACY_SITES, null], default: null },
    is_active: { type: Boolean, default: true },
    design: {
      tokens: { type: [tokenSchema], default: [] },
      fonts: { type: [fontSchema], default: [] },
      font_urls: { type: [String], default: [] },
      base_css: { type: String, default: '' },
    },
    head_html: { type: String, default: '' },
    body_end_html: { type: String, default: '' },
    custom_css: { type: String, default: '' },
    custom_js: { type: String, default: '' },
    favicon_url: { type: String, default: '', trim: true, maxlength: 1000 },
    seo: {
      title: { type: String, default: '', trim: true, maxlength: 160 },
      description: { type: String, default: '', trim: true, maxlength: 320 },
      og_image_url: { type: String, default: '', trim: true, maxlength: 1000 },
    },
    header_fragment_id: { type: Schema.Types.ObjectId, ref: 'CmsFragment', default: null },
    footer_fragment_id: { type: Schema.Types.ObjectId, ref: 'CmsFragment', default: null },
    collections: { type: [String], enum: CMS_COLLECTIONS, default: [] },
    collection_paths: {
      type: [
        new Schema<CmsCollectionPath>(
          {
            collection: { type: String, enum: CMS_COLLECTIONS, required: true },
            path: { type: String, required: true, trim: true, maxlength: 200 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'cms_sites' }
);

// One hostname can only ever resolve to one site. Partial, not sparse: an empty
// `domains` array is still indexed, so two sites without a domain yet would
// collide on it.
cmsSiteSchema.index(
  { domains: 1 },
  { unique: true, partialFilterExpression: { 'domains.0': { $exists: true } } }
);

export const CmsSiteModel = model<ICmsSite>('CmsSite', cmsSiteSchema);
