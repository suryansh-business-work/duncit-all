import { Schema, model, type Types } from 'mongoose';

/**
 * One message in an Ask Duncit conversation — the person's question or the
 * assistant's answer, with what the answer used (tools, knowledge), what it
 * cost, how it was judged (confidence, out-of-context) and the person's
 * thumbs-up/down with its operator review.
 */

export const MESSAGE_ROLES = ['user', 'assistant'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const MESSAGE_STATUSES = ['STREAMING', 'COMPLETE', 'FAILED', 'STOPPED'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const ATTACHMENT_KINDS = ['IMAGE', 'PDF', 'AUDIO', 'FILE'] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const TOOL_CALL_STATUSES = ['OK', 'DENIED', 'ERROR', 'BLOCKED', 'INVALID', 'AWAITING_APPROVAL'] as const;
export type ToolCallStatus = (typeof TOOL_CALL_STATUSES)[number];

export const FEEDBACK_RATINGS = ['UP', 'DOWN'] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

export const REVIEW_STATUSES = ['PENDING', 'ACCEPTED', 'DISMISSED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface MessageAttachment {
  url: string;
  kind: AttachmentKind;
  name: string;
  mime: string;
  size: number;
}

export interface MessageToolCall {
  name: string;
  title: string;
  risk: string;
  status: ToolCallStatus;
  duration_ms: number;
  error_code: string;
  action_id: string | null;
}

export interface MessageFeedback {
  rating: FeedbackRating;
  comment: string;
  at: Date;
  review_status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  review_note: string;
}

export interface IAskDuncitMessage {
  _id: Types.ObjectId;
  conversation_id: Types.ObjectId;
  user_id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  attachments: MessageAttachment[];
  tool_calls: MessageToolCall[];
  action_ids: string[];
  knowledge_refs: Array<{ id: string; title: string }>;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  latency_ms: number;
  first_token_ms: number;
  confidence: number | null;
  low_confidence: boolean;
  out_of_context: boolean;
  resolved: boolean | null;
  eval_reason: string;
  injection_flags: string[];
  feedback: MessageFeedback | null;
  error_code: string;
  created_at: Date;
  updated_at: Date;
}

const attachmentSchema = new Schema<MessageAttachment>(
  {
    url: { type: String, required: true },
    kind: { type: String, enum: ATTACHMENT_KINDS, required: true },
    name: { type: String, default: '' },
    mime: { type: String, default: '' },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const toolCallSchema = new Schema<MessageToolCall>(
  {
    name: { type: String, required: true },
    title: { type: String, default: '' },
    risk: { type: String, default: 'READ' },
    status: { type: String, enum: TOOL_CALL_STATUSES, required: true },
    duration_ms: { type: Number, default: 0 },
    error_code: { type: String, default: '' },
    action_id: { type: String, default: null },
  },
  { _id: false }
);

const feedbackSchema = new Schema<MessageFeedback>(
  {
    rating: { type: String, enum: FEEDBACK_RATINGS, required: true },
    comment: { type: String, default: '' },
    at: { type: Date, default: Date.now },
    review_status: { type: String, enum: REVIEW_STATUSES, default: 'PENDING' },
    reviewed_by: { type: String, default: null },
    reviewed_at: { type: Date, default: null },
    review_note: { type: String, default: '' },
  },
  { _id: false }
);

const messageSchema = new Schema<IAskDuncitMessage>(
  {
    conversation_id: { type: Schema.Types.ObjectId, ref: 'AskDuncitConversation', required: true },
    user_id: { type: String, required: true },
    role: { type: String, enum: MESSAGE_ROLES, required: true },
    content: { type: String, default: '' },
    status: { type: String, enum: MESSAGE_STATUSES, default: 'COMPLETE' },
    attachments: { type: [attachmentSchema], default: [] },
    tool_calls: { type: [toolCallSchema], default: [] },
    action_ids: { type: [String], default: [] },
    knowledge_refs: { type: [{ id: String, title: String, _id: false }], default: [] },
    model: { type: String, default: '' },
    prompt_tokens: { type: Number, default: 0 },
    completion_tokens: { type: Number, default: 0 },
    cost_usd: { type: Number, default: 0 },
    latency_ms: { type: Number, default: 0 },
    first_token_ms: { type: Number, default: 0 },
    confidence: { type: Number, default: null },
    low_confidence: { type: Boolean, default: false },
    out_of_context: { type: Boolean, default: false },
    resolved: { type: Boolean, default: null },
    eval_reason: { type: String, default: '' },
    injection_flags: { type: [String], default: [] },
    feedback: { type: feedbackSchema, default: null },
    error_code: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

messageSchema.index({ conversation_id: 1, created_at: 1 });
messageSchema.index({ user_id: 1, role: 1, created_at: -1 });
messageSchema.index({ 'feedback.rating': 1, 'feedback.review_status': 1, created_at: -1 });
messageSchema.index({ low_confidence: 1, created_at: -1 });

export const AskDuncitMessageModel = model<IAskDuncitMessage>('AskDuncitMessage', messageSchema);
