import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * One transactional email the server sends, editable from the console. The
 * body is plain text with {placeholders}; the server wraps it in the Duncit
 * email chrome at send time, so an admin edits words rather than HTML.
 */
const emailTemplateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    vars: { type: [String], default: [] },
    sent_count: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export type LiteEmailTemplate = InferSchemaType<typeof emailTemplateSchema>;
export const LiteEmailTemplateModel = model('LiteEmailTemplate', emailTemplateSchema, 'lite_email_templates');
