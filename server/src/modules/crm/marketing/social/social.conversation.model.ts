import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import {
  SOCIAL_AI_STATUSES,
  SOCIAL_INBOX_STATUSES,
  SOCIAL_MESSAGE_DIRECTIONS,
  SOCIAL_MESSAGE_STATUSES,
  SOCIAL_PLATFORMS,
  SOCIAL_SENTIMENTS,
  SOCIAL_SEVERITIES,
} from './social.types';

const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' } as const;

/**
 * A direct-message conversation between one connected account (an Instagram
 * professional account or a Facebook Page) and one person, worked in the
 * Inbox the way a comment is: an AI read, a status, an assignee.
 *
 * `last_inbound_at` is the person's last message — what Meta's messaging
 * window is measured from (social.window.ts); it is never moved by our own
 * replies. `opted_out` is set when the person sends a stop keyword, and no
 * automation writes to them again.
 */
const participantSchema = new Schema(
  {
    /** Instagram-scoped id (IGSID) or Page-scoped id (PSID). */
    external_id: { type: String, required: true },
    username: { type: String, default: '' },
    name: { type: String, default: '' },
    avatar_url: { type: String, default: '' },
  },
  { _id: false }
);

const conversationSchema = new Schema(
  {
    account_id: { type: String, required: true, index: true },
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
    participant: { type: participantSchema, required: true },
    /** The network's own conversation id when it names one (backfill); '' for one first seen on a webhook. */
    external_thread_id: { type: String, default: '' },
    last_message_at: { type: Date, default: null, index: true },
    last_inbound_at: { type: Date, default: null },
    last_message_text: { type: String, default: '' },
    unread_count: { type: Number, default: 0 },
    status: { type: String, enum: SOCIAL_INBOX_STATUSES, default: 'OPEN', index: true },
    assigned_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    ai_status: { type: String, enum: SOCIAL_AI_STATUSES, default: 'PENDING', index: true },
    ai_sentiment: { type: String, enum: [...SOCIAL_SENTIMENTS, null], default: null },
    ai_severity: { type: String, enum: [...SOCIAL_SEVERITIES, null], default: null },
    ai_reason: { type: String, default: '' },
    opted_out: { type: Boolean, default: false },
    /** The Instagram Leads / Marketing lead this person was matched to, when one was. */
    ig_lead_id: { type: Schema.Types.ObjectId, ref: 'IgLead', default: null },
    marketing_lead_id: { type: Schema.Types.ObjectId, ref: 'MarketingLead', default: null },
    // Set while a reply is going out, so a double press cannot send it twice.
    reply_lock_at: { type: Date, default: null },
  },
  { timestamps }
);
// One conversation per person per account, however the first message arrived.
conversationSchema.index({ account_id: 1, 'participant.external_id': 1 }, { unique: true });

const attachmentSchema = new Schema({ type: { type: String, default: '' }, url: { type: String, default: '' } }, { _id: false });

/**
 * One message in a conversation. `external_id` is the network's message id
 * (`mid`): the same message arriving by webhook, by backfill and as the echo
 * of our own send is stored once.
 */
const messageSchema = new Schema(
  {
    conversation_id: { type: String, required: true, index: true },
    account_id: { type: String, required: true },
    external_id: { type: String, default: '' },
    direction: { type: String, enum: SOCIAL_MESSAGE_DIRECTIONS, required: true },
    text: { type: String, default: '' },
    attachments: { type: [attachmentSchema], default: [] },
    sent_at: { type: Date, required: true },
    status: { type: String, enum: SOCIAL_MESSAGE_STATUSES, required: true },
    error: { type: String, default: '' },
    /** Who sent an outbound message: a person, or an automation rule. */
    sent_by_user_id: { type: String, default: '' },
    sent_by_name: { type: String, default: '' },
    automation_rule_id: { type: String, default: '' },
    /** HUMAN_AGENT when it went out on Meta's human agent tag (24 h – 7 days). */
    tag: { type: String, default: '' },
  },
  { timestamps }
);
messageSchema.index({ conversation_id: 1, sent_at: 1 });
messageSchema.index(
  { account_id: 1, external_id: 1 },
  { unique: true, partialFilterExpression: { external_id: { $type: 'string', $gt: '' } } }
);

export type SocialConversationDoc = InferSchemaType<typeof conversationSchema> & { _id: Types.ObjectId };
export type SocialMessageDoc = InferSchemaType<typeof messageSchema> & { _id: Types.ObjectId };

export const SocialConversationModel = model('SocialConversation', conversationSchema);
export const SocialMessageModel = model('SocialMessage', messageSchema);
