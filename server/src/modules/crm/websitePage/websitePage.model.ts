import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * A single page discovered (and optionally content-fetched) from a CRM lead's
 * website. Pages are scoped to the owning lead via (entity_type, lead_id) and
 * de-duped per-lead by URL. Discovery saves rows in `DISCOVERED` state; the
 * per-page "Fetch content" action populates `content_text` and flips status.
 */
export const WEBSITE_PAGE_STATUSES = ['DISCOVERED', 'FETCHED', 'ERROR'] as const;
export type WebsitePageStatus = (typeof WEBSITE_PAGE_STATUSES)[number];

const websitePageSchema = new Schema(
  {
    entity_type: { type: String, enum: ['VENUE_LEAD', 'HOST_LEAD'], required: true, index: true },
    lead_id: { type: Schema.Types.ObjectId, required: true, index: true },
    url: { type: String, required: true, trim: true },
    title: { type: String, default: null },
    status: { type: String, enum: WEBSITE_PAGE_STATUSES, default: 'DISCOVERED', index: true },
    http_status: { type: Number, default: null },
    content_text: { type: String, default: null },
    content_chars: { type: Number, default: 0 },
    error: { type: String, default: null },
    fetched_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One row per URL per lead — re-scraping is idempotent.
websitePageSchema.index({ entity_type: 1, lead_id: 1, url: 1 }, { unique: true });

export type WebsitePageDoc = InferSchemaType<typeof websitePageSchema> & { _id: Types.ObjectId };
export const WebsitePageModel = model('CrmWebsitePage', websitePageSchema);
