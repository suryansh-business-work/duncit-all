import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Marketing → Social → Auto-replies. A rule answers an inbound DM or comment
 * on its own: a keyword DM, a question it knows (FAQ), a person's first DM
 * (welcome), or a comment asking for "price" or "link" (a private reply to
 * the commenter, comment-to-DM). Nothing here can start a conversation: the
 * engine (social.autoReply.ts) fires only on an inbound event, inside Meta's
 * 24-hour window, never to someone who opted out, under the daily cap.
 */
export const AUTO_REPLY_KINDS = ['KEYWORD', 'FAQ', 'WELCOME', 'COMMENT_TO_DM'] as const;
export type AutoReplyKind = (typeof AUTO_REPLY_KINDS)[number];

/** Which kinds answer a DM, in the order they are tried; COMMENT_TO_DM answers comments only. */
export const DM_RULE_ORDER: readonly AutoReplyKind[] = ['KEYWORD', 'FAQ', 'WELCOME'];

const ruleSchema = new Schema(
  {
    name: { type: String, required: true },
    kind: { type: String, enum: AUTO_REPLY_KINDS, required: true },
    /** Upper-cased words or phrases; empty for WELCOME. */
    keywords: { type: [String], default: [] },
    reply_text: { type: String, required: true },
    /** The accounts the rule answers for; empty means every connected Facebook and Instagram account. */
    account_ids: { type: [String], default: [] },
    /** A trusted rule sends at once even when Settings asks for approval. */
    trusted: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true, index: true },
    created_by: { type: String, default: '' },
    updated_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type SocialAutoReplyRuleDoc = InferSchemaType<typeof ruleSchema> & { _id: unknown; created_at?: Date; updated_at?: Date };
export const SocialAutoReplyRuleModel = model('SocialAutoReplyRule', ruleSchema, 'social_auto_reply_rules');

export const AUTO_REPLY_STATUSES = ['AWAITING_APPROVAL', 'SENT', 'FAILED', 'REJECTED'] as const;
export type AutoReplyStatus = (typeof AUTO_REPLY_STATUSES)[number];

/** Replies that count against an account's daily cap: sent, or waiting for a yes. */
export const CAPPED_STATUSES: readonly AutoReplyStatus[] = ['AWAITING_APPROVAL', 'SENT'];

/**
 * One auto-reply a rule made. `trigger_key` (account + the inbound message's
 * or comment's id) is unique, so the same event arriving twice — a webhook
 * retry, the webhook and the sync — is answered once.
 */
const replySchema = new Schema(
  {
    trigger_key: { type: String, required: true, unique: true },
    rule_id: { type: String, required: true, index: true },
    rule_name: { type: String, default: '' },
    kind: { type: String, enum: AUTO_REPLY_KINDS, required: true },
    account_id: { type: String, required: true },
    /** The conversation a DM reply goes to, or '' for a comment's private reply. */
    conversation_id: { type: String, default: '' },
    /** The stored comment a private reply answers, or '' for a DM. */
    comment_id: { type: String, default: '' },
    text: { type: String, required: true },
    status: { type: String, enum: AUTO_REPLY_STATUSES, required: true },
    run_id: { type: String, default: '', index: true },
    error: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
replySchema.index({ account_id: 1, created_at: -1 });

export type SocialAutoReplyDoc = InferSchemaType<typeof replySchema> & { _id: unknown; created_at?: Date };
export const SocialAutoReplyModel = model('SocialAutoReply', replySchema, 'social_auto_replies');
