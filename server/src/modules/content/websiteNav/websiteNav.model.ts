import { Schema, model, type Document } from 'mongoose';

export type WebsiteNavSite = 'MAIN' | 'PARTNERS' | 'ADS' | 'EARNWITH';
export type WebsiteNavArea = 'HEADER' | 'FOOTER';

/** One link in a marketing website's header drawer or footer columns —
 * managed from the Website portal so site navigation is never hardcoded. */
export interface IWebsiteNavItem extends Document {
  site: WebsiteNavSite;
  area: WebsiteNavArea;
  group_label: string; // section heading (header) / column heading (footer)
  label: string;
  url: string; // absolute or site-relative
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const websiteNavItemSchema = new Schema<IWebsiteNavItem>(
  {
    site: { type: String, enum: ['MAIN', 'PARTNERS', 'ADS', 'EARNWITH'], required: true, index: true },
    area: { type: String, enum: ['HEADER', 'FOOTER'], required: true },
    group_label: { type: String, default: '', trim: true, maxlength: 60 },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

websiteNavItemSchema.index({ site: 1, area: 1, sort_order: 1 });

export const WebsiteNavItemModel = model<IWebsiteNavItem>('WebsiteNavItem', websiteNavItemSchema);
