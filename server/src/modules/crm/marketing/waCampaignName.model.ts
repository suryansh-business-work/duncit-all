import { Schema, model, InferSchemaType, type Types } from 'mongoose';

/**
 * An AiSensy campaign (WhatsApp template) marketing is allowed to send.
 *
 * AiSensy's campaign API cannot list a workspace's campaigns, so the names a
 * marketer can pick are maintained here: added once, then chosen from a
 * dropdown. A typo in a campaign name fails every message in the send, which
 * is exactly what a picked-from-a-list value prevents.
 */
const waCampaignNameSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, unique: true },
    /** What this template says, so the right one is picked months later. */
    description: { type: String, default: '', trim: true, maxlength: 300 },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type WaCampaignNameDoc = InferSchemaType<typeof waCampaignNameSchema> & {
  _id: Types.ObjectId;
};
export const WaCampaignNameModel = model('MarketingWaCampaignName', waCampaignNameSchema);
