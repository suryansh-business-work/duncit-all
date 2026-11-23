import { Schema, model, type Types } from 'mongoose';
import { INTEL_ENV_CHOICES, type IntelEnvChoice } from '../intel.constants';

/**
 * Conversations and messages. Every read and write is scoped by `owner_id`
 * (intelConversation.service) — one person can never list, open or change
 * another's chats, admins included. Model, environment and sources are stored
 * per conversation so it reopens exactly as it was left.
 */

export interface IIntelConversation {
  _id: Types.ObjectId;
  owner_id: Types.ObjectId;
  title: string;
  title_generated: boolean;
  pinned: boolean;
  archived: boolean;
  deleted_at: Date | null;
  model: string;
  environment: IntelEnvChoice;
  /** Empty = all sources the person may use. */
  sources: string[];
  message_count: number;
  last_message_at: Date;
  created_at: Date;
  updated_at: Date;
}

const conversationSchema = new Schema<IIntelConversation>(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New chat', maxlength: 120 },
    title_generated: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    deleted_at: { type: Date, default: null },
    model: { type: String, default: '' },
    environment: { type: String, enum: INTEL_ENV_CHOICES, default: 'STAGING' },
    sources: { type: [String], default: [] },
    message_count: { type: Number, default: 0 },
    last_message_at: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
conversationSchema.index({ owner_id: 1, deleted_at: 1, archived: 1, last_message_at: -1 });
conversationSchema.index({ owner_id: 1, title: 1 });

export const IntelConversationModel = model<IIntelConversation>('IntelConversation', conversationSchema, 'intel_conversations');

export type MessageStatus = 'STREAMING' | 'COMPLETE' | 'FAILED' | 'STOPPED';

export interface MessageCitation {
  ref: string;
  title: string;
  url: string;
  source: string;
  environment: string;
  snippet: string;
  page: number | null;
  line_start: number | null;
  line_end: number | null;
}

export interface MessageToolCall {
  name: string;
  title: string;
  status: 'OK' | 'FAILED' | 'DENIED' | 'AWAITING_APPROVAL';
  summary: string;
}

export interface IIntelMessage {
  _id: Types.ObjectId;
  conversation_id: Types.ObjectId;
  owner_id: Types.ObjectId;
  role: 'USER' | 'ASSISTANT';
  content: string;
  status: MessageStatus;
  citations: MessageCitation[];
  tool_calls: MessageToolCall[];
  approval_ids: string[];
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  error_code: string;
  error_message: string;
  /** Replaced by an edit or a regenerate — kept for the record, hidden from the thread. */
  superseded: boolean;
  edit_history: Array<{ content: string; edited_at: Date }>;
  created_at: Date;
  updated_at: Date;
}

const citationSchema = new Schema<MessageCitation>(
  {
    ref: String,
    title: String,
    url: String,
    source: String,
    environment: String,
    snippet: String,
    page: { type: Number, default: null },
    line_start: { type: Number, default: null },
    line_end: { type: Number, default: null },
  },
  { _id: false }
);

const toolCallSchema = new Schema<MessageToolCall>({ name: String, title: String, status: String, summary: String }, { _id: false });

const messageSchema = new Schema<IIntelMessage>(
  {
    conversation_id: { type: Schema.Types.ObjectId, ref: 'IntelConversation', required: true },
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['USER', 'ASSISTANT'], required: true },
    content: { type: String, default: '' },
    status: { type: String, enum: ['STREAMING', 'COMPLETE', 'FAILED', 'STOPPED'], default: 'COMPLETE' },
    citations: { type: [citationSchema], default: [] },
    tool_calls: { type: [toolCallSchema], default: [] },
    approval_ids: { type: [String], default: [] },
    model: { type: String, default: '' },
    prompt_tokens: { type: Number, default: 0 },
    completion_tokens: { type: Number, default: 0 },
    error_code: { type: String, default: '' },
    error_message: { type: String, default: '' },
    superseded: { type: Boolean, default: false },
    edit_history: { type: [{ content: String, edited_at: Date }], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
messageSchema.index({ conversation_id: 1, superseded: 1, created_at: 1 });
messageSchema.index({ owner_id: 1, content: 'text' });

export const IntelMessageModel = model<IIntelMessage>('IntelMessage', messageSchema, 'intel_messages');
