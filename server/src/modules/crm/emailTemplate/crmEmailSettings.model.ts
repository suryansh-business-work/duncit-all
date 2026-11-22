import { Schema, model, type InferSchemaType } from 'mongoose';
import { CRM_EMAIL_COLOR_MODES } from './crmEmailTheme';

/**
 * CRM › Email Templates › Settings — one document for the whole CRM store
 * (`key: 'default'`). Separate from the core/admin email settings for the same
 * reason CRM templates are a separate collection: the CRM's outreach look must
 * never leak into system mail, nor system mail's into the CRM.
 */

export const CRM_EMAIL_ASSET_KINDS = ['LOGO', 'BANNER', 'IMAGE'] as const;
export type CrmEmailAssetKind = (typeof CRM_EMAIL_ASSET_KINDS)[number];

const brandAssetSchema = new Schema(
  {
    kind: { type: String, enum: CRM_EMAIL_ASSET_KINDS, required: true },
    url: { type: String, required: true, trim: true },
    name: { type: String, trim: true, default: '' },
    mime_type: { type: String, trim: true, default: '' },
    size_bytes: { type: Number, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    created_by: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
  },
  { _id: true }
);

// Every field optional: a missing one renders with the shared token, so a
// document written before a field existed keeps rendering exactly as it did.
const themeSchema = new Schema(
  {
    primary_color: String,
    accent_color: String,
    heading_color: String,
    text_color: String,
    muted_color: String,
    background_color: String,
    card_color: String,
    panel_color: String,
    border_color: String,
    body_font: String,
    heading_font: String,
    base_font_size: Number,
    content_padding: Number,
    button_radius: Number,
    panel_radius: Number,
    color_mode: { type: String, enum: CRM_EMAIL_COLOR_MODES },
    dark_background_color: String,
    dark_card_color: String,
    dark_heading_color: String,
    dark_text_color: String,
    dark_primary_color: String,
  },
  { _id: false }
);

const crmEmailSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    assets: { type: [brandAssetSchema], default: [] },
    // The logo the header fragment shows on CRM emails; null = the Duncit brand logo.
    primary_logo_id: { type: Schema.Types.ObjectId, default: null },
    theme: { type: themeSchema, default: () => ({}) },
    updated_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type CrmEmailSettingsDoc = InferSchemaType<typeof crmEmailSettingsSchema>;
export const CrmEmailSettingsModel = model('CrmEmailSettings', crmEmailSettingsSchema);
