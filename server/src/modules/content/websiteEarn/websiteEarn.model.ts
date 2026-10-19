import { Schema, model, type Document } from 'mongoose';

/**
 * Website portal > Earn with Duncit — one document per marketing site.
 *
 * Drives the featured "Earn with Duncit" section and the floating Earn pill on
 * each home page. earnwith.duncit.com IS the earn site, so it has no row.
 * Blank copy fields mean "use the localized default", so an untouched site
 * still speaks every language the bundle does.
 */
export const EARN_SITES = ['MAIN', 'PARTNERS', 'ADS'] as const;
export type EarnSite = (typeof EARN_SITES)[number];

/** Where the section sits on the home page; the site keeps an anchor for each. */
export const EARN_POSITIONS = ['AFTER_REELS', 'AFTER_DOWNLOAD', 'BEFORE_FOOTER'] as const;
export type EarnPosition = (typeof EARN_POSITIONS)[number];

/** WALL = the drifting photo wall; SPLIT = copy beside a photo collage. */
export const EARN_VARIANTS = ['WALL', 'SPLIT'] as const;
export type EarnVariant = (typeof EARN_VARIANTS)[number];

/** A brand token, never a raw colour — the sites map it onto their palette. */
export const EARN_ACCENTS = ['PRIMARY', 'SECONDARY', 'TERTIARY'] as const;
export type EarnAccent = (typeof EARN_ACCENTS)[number];

export const EARN_LIMITS = {
  eyebrow: 40,
  heading: 60,
  heading_muted: 60,
  text: 240,
  cta_label: 40,
  floating_label: 40,
  url: 1000,
  images: 13,
} as const;

export interface IWebsiteEarnSection extends Document {
  site: EarnSite;
  enabled: boolean;
  position: EarnPosition;
  variant: EarnVariant;
  accent: EarnAccent;
  eyebrow: string;
  heading: string;
  heading_muted: string;
  text: string;
  cta_label: string;
  /** Blank = the earnwith site's address the website was built with. */
  cta_url: string;
  /** Blank = the bundled photo wall. */
  images: string[];
  floating_enabled: boolean;
  floating_label: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

const websiteEarnSectionSchema = new Schema<IWebsiteEarnSection>(
  {
    site: { type: String, required: true, unique: true, enum: EARN_SITES },
    enabled: { type: Boolean, default: true },
    position: { type: String, enum: EARN_POSITIONS, default: 'AFTER_REELS' },
    variant: { type: String, enum: EARN_VARIANTS, default: 'WALL' },
    accent: { type: String, enum: EARN_ACCENTS, default: 'PRIMARY' },
    eyebrow: { type: String, default: '' },
    heading: { type: String, default: '' },
    heading_muted: { type: String, default: '' },
    text: { type: String, default: '' },
    cta_label: { type: String, default: '' },
    cta_url: { type: String, default: '' },
    images: { type: [String], default: [] },
    floating_enabled: { type: Boolean, default: true },
    floating_label: { type: String, default: '' },
    updated_by: { type: String, default: '' },
  },
  {
    collection: 'websiteearnsections',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const WebsiteEarnSectionModel = model<IWebsiteEarnSection>('WebsiteEarnSection', websiteEarnSectionSchema);
