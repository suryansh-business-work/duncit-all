import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * One saved state of an AI Library prompt — the "version/change history" the
 * detail view lists.
 *
 * A row is written after every save that changed something a reader cares
 * about (see `TRACKED_FIELDS` in prompt.version.ts), so restoring a version is
 * copying its snapshot back. The fields are a SNAPSHOT, not a diff: the history
 * must still read correctly after the prompt is edited again, and a diff chain
 * breaks the moment one link is missing.
 *
 * `version` is unique per prompt and assigned by an atomic `$inc` on the
 * prompt's own `revision`, so two saves landing together still get two numbers.
 */
export const PROMPT_CHANGES = ['BASELINE', 'CREATE', 'UPDATE', 'SEED'] as const;
export type PromptChange = (typeof PROMPT_CHANGES)[number];

const aiPromptVersionSchema = new Schema(
  {
    prompt_id: { type: Schema.Types.ObjectId, required: true, ref: 'AiPrompt' },
    version: { type: Number, required: true },
    /**
     * BASELINE — the state a prompt was in when history began (written once,
     * before its first tracked edit). CREATE — it was made. UPDATE — a person
     * changed it. SEED — the server changed it on boot, with nobody signed in.
     */
    change: { type: String, enum: PROMPT_CHANGES, required: true },
    changed_fields: { type: [String], default: [] },
    name: { type: String, default: '' },
    description: { type: String, default: '' },
    content: { type: String, default: '' },
    category: { type: String, default: '' },
    target_model: { type: String, default: '' },
    role: { type: String, default: 'SYSTEM' },
    is_active: { type: Boolean, default: true },
    edited_by: { type: Schema.Types.ObjectId, default: null },
    edited_by_name: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

aiPromptVersionSchema.index({ prompt_id: 1, version: -1 }, { unique: true });

export type AiPromptVersionDoc = InferSchemaType<typeof aiPromptVersionSchema> & { _id: Types.ObjectId };
export const AiPromptVersionModel = model('AiPromptVersion', aiPromptVersionSchema);
