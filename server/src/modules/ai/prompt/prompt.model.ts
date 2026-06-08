import { Schema, model, InferSchemaType } from 'mongoose';

/**
 * A reusable prompt in the AI Portal's Prompt Library. `content` is the prompt
 * body; its token size is DERIVED (never stored) so it always reflects the
 * current text. `category` + `model` are free-text organisational fields.
 */
const aiPromptSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true, default: '' },
    content: { type: String, required: true },
    category: { type: String, trim: true, default: 'General', index: true },
    // NB: not "model" — that's a reserved Mongoose Document pathname.
    target_model: { type: String, trim: true, default: '' },
    is_active: { type: Boolean, default: true, index: true },
    created_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

aiPromptSchema.index({ is_active: 1, name: 1 });

export type AiPromptDoc = InferSchemaType<typeof aiPromptSchema> & { _id: any };
export const AiPromptModel = model('AiPrompt', aiPromptSchema);
