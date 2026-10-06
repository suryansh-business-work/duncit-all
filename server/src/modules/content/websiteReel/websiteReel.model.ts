import { Schema, model, type Document } from 'mongoose';
import type { WebsiteNavSite } from '../websiteNav/websiteNav.model';

/** One reel in a marketing website's home-page Reel Slider — uploaded and
 * captioned from the Website portal, never hardcoded into a site. */
export interface IWebsiteReel extends Document {
  site: WebsiteNavSite;
  title: string;
  description: string;
  video_url: string;
  /** Size of the uploaded file, recorded for the portal table. */
  file_size_bytes: number;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const websiteReelSchema = new Schema<IWebsiteReel>(
  {
    site: { type: String, enum: ['MAIN', 'PARTNERS', 'ADS', 'EARNWITH'], required: true, index: true },
    title: { type: String, default: '', trim: true, maxlength: 80 },
    description: { type: String, default: '', trim: true, maxlength: 240 },
    video_url: { type: String, required: true, trim: true, maxlength: 1000 },
    file_size_bytes: { type: Number, default: 0 },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

websiteReelSchema.index({ site: 1, is_active: 1, sort_order: 1 });

export const WebsiteReelModel = model<IWebsiteReel>('WebsiteReel', websiteReelSchema);
