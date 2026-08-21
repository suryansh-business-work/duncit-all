import { Schema, model, InferSchemaType } from 'mongoose';

/**
 * A prompt in the AI Library. `content` is the prompt body; its token size is
 * DERIVED (never stored) so it always reflects the current text.
 *
 * `kind` is the whole distinction the library is built around:
 *  - CODE — seeded from `catalog/` and READ BACK by a call site on every
 *    request. Editing `content` or `target_model` here changes what the product
 *    sends to the model. It cannot be created or deleted from the portal, and
 *    everything else on the row belongs to the catalogue, which overwrites it on
 *    the next boot.
 *  - AI — authored in the AI portal, owned by nobody in code, fully editable,
 *    and served by the public GET feed.
 *
 * A CODE row is the one with a `key`; an AI row has none, which is what the
 * sparse unique index below depends on.
 */
const variableSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    label: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    required: { type: Boolean, default: false },
    example: { type: String, default: '' },
  },
  { _id: false }
);

/** Where a CODE prompt is wired in. Catalogue-owned; shown read-only in the portal. */
const usageSchema = new Schema(
  {
    file: { type: String, trim: true, default: '' },
    surface: { type: String, trim: true, default: '' },
    trigger: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const aiPromptSchema = new Schema(
  {
    // Stable catalog identifier for CODE prompts. Deliberately has NO default:
    // the sparse unique index skips documents where the path is absent, but it
    // would still collide on many rows storing an explicit null.
    key: { type: String, trim: true, unique: true, sparse: true },
    kind: { type: String, enum: ['CODE', 'AI'], default: 'AI', index: true },
    role: { type: String, enum: ['SYSTEM', 'USER'], default: 'SYSTEM' },
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true, default: '' },
    content: { type: String, required: true },
    category: { type: String, trim: true, default: 'General', index: true },
    // NB: not "model" — that's a reserved Mongoose Document pathname.
    target_model: { type: String, trim: true, default: '' },
    // Placeholders the call site fills in ({{name}}). Catalogue-owned on a CODE
    // row; derived from the body on save for an AI one.
    variables: { type: [variableSchema], default: [] },
    // Usage-log task keys this prompt bills to, so "how often did this run" is
    // answerable — the two namespaces do not line up by name.
    tasks: { type: [String], default: [] },
    usage: { type: [usageSchema], default: [] },
    is_active: { type: Boolean, default: true, index: true },
    created_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

aiPromptSchema.index({ is_active: 1, name: 1 });
aiPromptSchema.index({ kind: 1, category: 1, name: 1 });

export type AiPromptDoc = InferSchemaType<typeof aiPromptSchema> & { _id: any };
export const AiPromptModel = model('AiPrompt', aiPromptSchema);
