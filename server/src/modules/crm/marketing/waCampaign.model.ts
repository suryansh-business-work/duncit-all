import { Schema, model, InferSchemaType, type Types } from 'mongoose';

/** Newsletter subscribers are deliberately absent: a WhatsApp send needs a
 * phone number, and a subscriber row only ever carries an email address. */
export type WaCampaignAudience = 'ALL_USERS' | 'AUDIENCE_LIST';
export type WaCampaignStatus = 'SENDING' | 'SENT' | 'FAILED';

/**
 * One WhatsApp send to a Target Audience, through AiSensy.
 *
 * Unlike an email campaign there is no body stored here: the message text lives
 * in the approved WhatsApp template on AiSensy's side, and this document only
 * decides which template, who receives it, and what fills its variables.
 * Recipients are resolved at send time from the audience, never frozen.
 */
const waCampaignSchema = new Schema(
  {
    campaign_id: { type: String, required: true, unique: true, index: true },
    /** Internal name for this send — how marketing recognises it in the table. */
    name: { type: String, required: true, trim: true, maxlength: 120 },
    /** The AiSensy campaign/template this send uses. */
    wa_campaign_name: { type: String, required: true, trim: true, maxlength: 120 },
    audience: { type: String, enum: ['ALL_USERS', 'AUDIENCE_LIST'], required: true },
    audience_list_id: { type: Schema.Types.ObjectId, ref: 'AudienceList', default: null },
    /** Ordered template variables. Each is literal text or carries {{tokens}}
     * resolved per recipient (see waCampaign.service). */
    template_params: { type: [String], default: [] },
    status: { type: String, enum: ['SENDING', 'SENT', 'FAILED'], default: 'SENDING', index: true },
    recipient_count: { type: Number, default: 0, min: 0 },
    sent_count: { type: Number, default: 0, min: 0 },
    failed_count: { type: Number, default: 0, min: 0 },
    /** Matched the audience but had no usable number or an empty variable. */
    skipped_count: { type: Number, default: 0, min: 0 },
    error: { type: String, default: null },
    sent_at: { type: Date, default: null },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

waCampaignSchema.index({ created_at: -1 });

export type WaCampaignDoc = InferSchemaType<typeof waCampaignSchema> & { _id: Types.ObjectId };
export const WaCampaignModel = model('MarketingWaCampaign', waCampaignSchema);
