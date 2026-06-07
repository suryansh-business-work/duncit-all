import { Schema, model, InferSchemaType } from 'mongoose';

/**
 * Environment categories the Tech portal manages. Each category can hold
 * MULTIPLE named entries (e.g. two ImageKit accounts, three SMTP mailboxes).
 * "Email" is SMTP. Google is split into OAuth vs Maps, and AI into OpenAI vs
 * Gemini, since each side has distinct fields + its own test.
 */
export const ENV_CATEGORIES = [
  'EMAIL',
  'IMAGEKIT',
  'PEXELS',
  'GOOGLE_OAUTH',
  'GOOGLE_MAPS',
  'TWILIO',
  'OPENAI',
  'GEMINI',
  'SERVAM',
  'RAZORPAY',
] as const;
export type EnvCategory = (typeof ENV_CATEGORIES)[number];

/**
 * A single named credential set inside a category. `config` is Mixed so each
 * category stores only the keys it needs; the service validates + masks per
 * category. `assigned_portals` is the many-to-many mapping edited from the
 * Portal → Environment page (portal keys from the portalMode registry).
 */
const envEntrySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    category: { type: String, enum: ENV_CATEGORIES, required: true, index: true },
    description: { type: String, trim: true, default: '' },
    is_default: { type: Boolean, default: false, index: true },
    is_active: { type: Boolean, default: true, index: true },
    config: { type: Schema.Types.Mixed, default: {} },
    assigned_portals: { type: [String], default: [], index: true },
    last_used_at: { type: Date, default: null },
    last_tested_at: { type: Date, default: null },
    last_test_ok: { type: Boolean, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

envEntrySchema.index({ category: 1, is_default: 1 });

export type EnvEntryDoc = InferSchemaType<typeof envEntrySchema> & { _id: any };
export const EnvEntryModel = model('EnvEntry', envEntrySchema);
