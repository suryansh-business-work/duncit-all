import { Schema, model, InferSchemaType, type Types } from 'mongoose';

/** Newsletter subscribers are deliberately absent: a WhatsApp send needs a
 * phone number, and a subscriber row only ever carries an email address.
 *
 * SPECIFIC_USERS and MANUAL_NUMBERS are the two "just these people" sends:
 * the first picks accounts (their saved number is used), the second carries
 * numbers that may belong to nobody with an account at all. */
export type WaCampaignAudience =
  | 'ALL_USERS'
  | 'AUDIENCE_LIST'
  | 'SPECIFIC_USERS'
  | 'MANUAL_NUMBERS';

export const WA_CAMPAIGN_AUDIENCES: WaCampaignAudience[] = [
  'ALL_USERS',
  'AUDIENCE_LIST',
  'SPECIFIC_USERS',
  'MANUAL_NUMBERS',
];
/** SCHEDULED is waiting for its hour and can still be cancelled; CANCELLED is
 * one that never ran, which is a different fact from one that ran and failed. */
export type WaCampaignStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

/** One typed-in recipient: the name AiSensy records and the number to reach,
 * kept apart so the country code is never guessed. */
const waManualContactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    extension: { type: String, required: true, trim: true, maxlength: 5 },
    number: { type: String, required: true, trim: true, maxlength: 15 },
  },
  { _id: false }
);

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
    audience: { type: String, enum: WA_CAMPAIGN_AUDIENCES, required: true },
    audience_list_id: { type: Schema.Types.ObjectId, ref: 'AudienceList', default: null },
    /** SPECIFIC_USERS only — the accounts that were picked. */
    user_ids: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    /** MANUAL_NUMBERS only — numbers typed in, which may belong to no account. */
    contacts: { type: [waManualContactSchema], default: [] },
    /** The template behind wa_campaign_name, as AiSensy had it when this send
     * was created. Frozen because a template can be renamed, re-categorised or
     * deleted, and a past send must keep saying what it actually sent. */
    template_name: { type: String, default: '', trim: true, maxlength: 160 },
    template_category: { type: String, default: '', trim: true, maxlength: 40 },
    /** The per-message rate in force when this send was created. Frozen for the
     * same reason an approved ad freezes its cost: a later price change must
     * not rewrite what a past send cost. */
    msg_rate: { type: Number, default: 0, min: 0 },
    /** Ordered template variables. Each is literal text or carries {{tokens}}
     * resolved per recipient (see waCampaign.service). */
    template_params: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED'],
      default: 'SENDING',
      index: true,
    },
    /** When a scheduled send is due. Null for one that went out immediately. */
    scheduled_at: { type: Date, default: null, index: true },
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
