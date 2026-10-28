import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * A legal page the console writes and the site shows at /legal/<slug> and in
 * the footer: privacy, terms of use, data policy, or any other the admin adds.
 * The body is rich-text HTML from the shared editor.
 */
const policySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    content: { type: String, default: '' },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
    /** The admin who saved it last. */
    updated_by: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

policySchema.index({ is_active: 1, sort_order: 1 });

export type LitePolicy = InferSchemaType<typeof policySchema>;
export type LitePolicyDoc = HydratedDocument<LitePolicy>;
export const LitePolicyModel = model('LitePolicy', policySchema, 'lite_policies');
