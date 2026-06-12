import { Schema, model, InferSchemaType } from 'mongoose';

/**
 * CRM-owned email templates. Deliberately a **separate** collection from the
 * core/admin `EmailTemplate` store (admin-credentials, payment-receipt, etc.) —
 * CRM templates are authored by CRM managers for lead outreach and must never
 * mix with admin/system templates. `template_id` is a stable UUID surfaced to
 * the client; `slug` is unique within the CRM store only.
 */
const variableSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    sample: { type: String, default: null },
  },
  { _id: false }
);

// Uploaded asset (image library entry or send attachment) — stored as a URL.
const assetSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    name: { type: String, default: null },
  },
  { _id: false }
);

const crmEmailTemplateSchema = new Schema(
  {
    template_id: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    subject: { type: String, required: true, trim: true },
    // Which lead kind this template is meant for — drives the editor's available
    // variables and which templates show in each lead's compose dialog.
    target: { type: String, enum: ['VENUE', 'HOST', 'ECOMM', 'STATIC'], default: 'STATIC', index: true },
    mjml: { type: String, required: true },
    variables: { type: [variableSchema], default: [] },
    // Per-template uploaded image library (shown in the editor's image dialog).
    images: { type: [assetSchema], default: [] },
    // Files attached to every send of this template.
    attachments: { type: [assetSchema], default: [] },
    is_active: { type: Boolean, default: true, index: true },
    created_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type CrmEmailTemplateDoc = InferSchemaType<typeof crmEmailTemplateSchema> & { _id: any };
export const CrmEmailTemplateModel = model('CrmEmailTemplate', crmEmailTemplateSchema);
