import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/** The credential categories the Lite console manages. */
export const LITE_ENV_CATEGORIES = ['EMAIL', 'IMAGEKIT', 'GOOGLE_OAUTH'] as const;
export type LiteEnvCategory = (typeof LITE_ENV_CATEGORIES)[number];

/**
 * A named credential set, the same shape the Tech portal keeps for the main
 * stack: several entries per category, exactly one active default, and a
 * Mixed `config` the service validates per category.
 */
const envEntrySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: LITE_ENV_CATEGORIES, required: true, index: true },
    description: { type: String, default: '' },
    is_default: { type: Boolean, default: false, index: true },
    is_active: { type: Boolean, default: true, index: true },
    config: { type: Schema.Types.Mixed, default: {} },
    last_tested_at: { type: Date, default: null },
    last_test_ok: { type: Boolean, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

envEntrySchema.index({ category: 1, is_default: 1 });

export type LiteEnvEntry = InferSchemaType<typeof envEntrySchema>;
export type LiteEnvEntryDoc = HydratedDocument<LiteEnvEntry>;
export const LiteEnvEntryModel = model('LiteEnvEntry', envEntrySchema, 'lite_env_entries');
