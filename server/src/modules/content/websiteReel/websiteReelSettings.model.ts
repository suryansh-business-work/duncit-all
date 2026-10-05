import { Schema, model, type Document } from 'mongoose';

/**
 * Website portal > Reel Slider Settings — one document for every site.
 *
 * `max_reel_mb` is checked in the portal before an upload starts (the file never
 * leaves the browser when it is too big); `max_reels` is enforced here, on every
 * write and again on the public read.
 */
export interface IWebsiteReelSettings extends Document {
  singleton_key: string;
  /** Largest reel file the portal accepts, in MB. */
  max_reel_mb: number;
  /** Most active reels one site's slider shows. */
  max_reels: number;
  updated_by: string;
  updated_at: Date;
}

/** Bounds every write is clamped to — the portal form validates the same. */
export const REEL_SETTINGS_BOUNDS = {
  max_reel_mb: { min: 1, max: 100, fallback: 20 },
  max_reels: { min: 1, max: 10, fallback: 10 },
} as const;

const B = REEL_SETTINGS_BOUNDS;

const websiteReelSettingsSchema = new Schema<IWebsiteReelSettings>(
  {
    singleton_key: { type: String, required: true, unique: true },
    max_reel_mb: { type: Number, default: B.max_reel_mb.fallback },
    max_reels: { type: Number, default: B.max_reels.fallback },
    updated_by: { type: String, default: '' },
  },
  {
    collection: 'websitereelsettings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const WebsiteReelSettingsModel = model<IWebsiteReelSettings>(
  'WebsiteReelSettings',
  websiteReelSettingsSchema
);
