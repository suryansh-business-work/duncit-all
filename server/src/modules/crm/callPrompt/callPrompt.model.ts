import { Schema, model, InferSchemaType } from 'mongoose';

/**
 * A reusable "Static Content" block fed into an AI Call. Operators curate these
 * in the CRM (AI Call Prompts → Static Content); when an agent picks one for an
 * "AI Call", `context` becomes the system prompt the Servam AI agent speaks in.
 * `language` lets a prompt target a specific Indian language (or `auto`).
 */
const callPromptSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true, default: '' },
    context: { type: String, required: true },
    language: { type: String, trim: true, default: 'auto' },
    is_active: { type: Boolean, default: true, index: true },
    created_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

callPromptSchema.index({ is_active: 1, name: 1 });

export type CallPromptDoc = InferSchemaType<typeof callPromptSchema> & { _id: any };
export const CallPromptModel = model('CrmCallPrompt', callPromptSchema);
