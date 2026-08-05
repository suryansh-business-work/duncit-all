import { Schema, model, InferSchemaType, type Types } from 'mongoose';

/** What happened to one person in a send. SKIPPED means nothing was attempted
 * (no usable number, or a template variable was empty for them) — nobody was
 * messaged and nothing was billed; FAILED means AiSensy refused the message. */
export type WaRecipientStatus = 'SENT' | 'SKIPPED' | 'FAILED';

/**
 * One row per person a WhatsApp campaign walked over.
 *
 * The campaign document keeps the counts; this keeps the answer to "who did it
 * reach, who did it not, and why" — which counts can never give. Kept in its
 * own collection because a send is one row per recipient and a campaign
 * document must not grow with the audience.
 */
const waCampaignRecipientSchema = new Schema(
  {
    campaign_id: { type: String, required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, default: '', trim: true },
    /** Country code + number, exactly as AiSensy was given it. */
    destination: { type: String, default: '', trim: true },
    status: { type: String, enum: ['SENT', 'SKIPPED', 'FAILED'], required: true, index: true },
    /** Why it was skipped or refused. Empty for a sent message. */
    reason: { type: String, default: '', trim: true },
    /** AiSensy's own id for the queued message — the trace back to their side. */
    submitted_message_id: { type: String, default: '', trim: true },
    /** The template variables as they were filled for THIS person. */
    template_params: { type: [String], default: [] },
    /** How many times the send has been attempted for this person — a retry
     * updates the row rather than adding a second one, so this is the only
     * place the second attempt is visible. */
    attempts: { type: Number, default: 1, min: 1 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

waCampaignRecipientSchema.index({ campaign_id: 1, status: 1 });
waCampaignRecipientSchema.index({ campaign_id: 1, created_at: 1 });

export type WaCampaignRecipientDoc = InferSchemaType<typeof waCampaignRecipientSchema> & {
  _id: Types.ObjectId;
};
export const WaCampaignRecipientModel = model(
  'MarketingWaCampaignRecipient',
  waCampaignRecipientSchema
);
