import { Schema, model, InferSchemaType } from 'mongoose';

/**
 * A reusable prompt in the AI Portal's Prompt Library. `content` is the prompt
 * body; its token size is DERIVED (never stored) so it always reflects the
 * current text. `category` + `model` are free-text organisational fields.
 *
 * Rows with a `key` are SYSTEM prompts: they back a shipped AI feature (image
 * scan, dummy-data generation, moderation…), are seeded from `prompt.catalog`
 * on boot and cannot be deleted — only their body is operator-owned.
 */
const aiPromptSchema = new Schema(
  {
    // Stable catalog identifier for system prompts. Deliberately has NO default:
    // the sparse unique index skips documents where the path is absent, but it
    // would still collide on many rows storing an explicit null.
    key: { type: String, trim: true, unique: true, sparse: true },
    is_system: { type: Boolean, default: false, index: true },
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true, default: '' },
    content: { type: String, required: true },
    category: { type: String, trim: true, default: 'General', index: true },
    // NB: not "model" — that's a reserved Mongoose Document pathname.
    target_model: { type: String, trim: true, default: '' },
    // Placeholder names the call site fills in ({{name}}), shown as edit hints.
    variables: { type: [String], default: [] },
    is_active: { type: Boolean, default: true, index: true },
    created_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

aiPromptSchema.index({ is_active: 1, name: 1 });

export type AiPromptDoc = InferSchemaType<typeof aiPromptSchema> & { _id: any };
export const AiPromptModel = model('AiPrompt', aiPromptSchema);
