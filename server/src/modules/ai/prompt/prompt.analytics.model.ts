import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * One interaction with an AI Library prompt — what the detail view's Analytics
 * tab counts: total hits, where people came from, which LLM they sent it to,
 * and how often it is used.
 *
 * Deliberately thin on identity. A public visitor is a random id their browser
 * made up (`visitor`), never an IP or an account; a referrer is kept as its HOST
 * only, because a full URL can carry someone's search terms or tokens. Rows age
 * out after ~13 months, the same horizon as the product clickstream.
 *
 * The collection name ends in `events`, which the table change-log plugin skips —
 * a hit is not an edit.
 */
export const PROMPT_EVENT_TYPES = [
  'DETAIL_VIEW',
  'QUICK_VIEW',
  'COPY_PROMPT',
  'COPY_LINK',
  'PUBLIC_VIEW',
  'OPEN_IN_PLATFORM',
  'COPY_SCRIPT',
  'FEED_HIT',
] as const;
export type PromptEventType = (typeof PROMPT_EVENT_TYPES)[number];

/** The LLMs the public page can hand a prompt to. */
export const PROMPT_PLATFORMS = ['CLAUDE', 'CHATGPT', 'GROK', 'PERPLEXITY'] as const;
export type PromptPlatform = (typeof PROMPT_PLATFORMS)[number];

/** Where the hit happened: the AI portal, the public share page, or the JSON feed. */
export const PROMPT_SURFACES = ['PORTAL', 'PUBLIC', 'FEED'] as const;
export type PromptSurface = (typeof PROMPT_SURFACES)[number];

export const PROMPT_DEVICES = ['desktop', 'mobile', 'tablet', 'bot', 'unknown'] as const;
export type PromptDevice = (typeof PROMPT_DEVICES)[number];

const THIRTEEN_MONTHS_S = 60 * 60 * 24 * 400;

const aiPromptEventSchema = new Schema(
  {
    prompt_id: { type: Schema.Types.ObjectId, required: true, ref: 'AiPrompt' },
    type: { type: String, enum: PROMPT_EVENT_TYPES, required: true },
    surface: { type: String, enum: PROMPT_SURFACES, required: true },
    platform: { type: String, enum: [...PROMPT_PLATFORMS, null], default: null },
    /** utm_source when the link carried one, else the referrer host, else `direct`. */
    source: { type: String, default: 'direct' },
    referrer_host: { type: String, default: null },
    device: { type: String, enum: PROMPT_DEVICES, default: 'unknown' },
    visitor: { type: String, default: null },
    user_id: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

aiPromptEventSchema.index({ prompt_id: 1, created_at: -1 });
aiPromptEventSchema.index({ created_at: 1 }, { expireAfterSeconds: THIRTEEN_MONTHS_S });

export type AiPromptEventDoc = InferSchemaType<typeof aiPromptEventSchema> & { _id: Types.ObjectId };
export const AiPromptEventModel = model('AiPromptEvent', aiPromptEventSchema);
