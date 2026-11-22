import { Schema, model, type Types } from 'mongoose';
import { ASK_DUNCIT_ROLE_KEYS, ASK_DUNCIT_SURFACES } from '../askDuncit.constants';

/**
 * One Ask Duncit conversation. It belongs to exactly one person (`user_id`) —
 * every read is scoped by it, so no conversation is ever readable by anyone
 * else except operators in the AI portal.
 *
 * A person "deleting" a conversation hides it from their history
 * (`deleted_at`); the audit trail keeps what happened regardless.
 */

export const CONVERSATION_STATUSES = ['ACTIVE', 'HANDED_OVER', 'ARCHIVED'] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const HANDOVER_TEAMS = ['SUPPORT', 'ADMIN', 'OPERATIONS'] as const;
export type HandoverTeam = (typeof HANDOVER_TEAMS)[number];

export interface IAskDuncitConversation {
  _id: Types.ObjectId;
  user_id: string;
  role_key: string;
  title: string;
  surface: string;
  locale: string;
  status: ConversationStatus;
  page_route: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  summarized_count: number;
  message_count: number;
  last_message_at: Date | null;
  last_message_preview: string;
  generating: boolean;
  handover_team: HandoverTeam | null;
  handover_ticket_id: string | null;
  handover_summary: string;
  handover_at: Date | null;
  out_of_context_count: number;
  violation_count: number;
  thumbs_up: number;
  thumbs_down: number;
  total_tokens: number;
  cost_usd: number;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const conversationSchema = new Schema<IAskDuncitConversation>(
  {
    user_id: { type: String, required: true },
    role_key: { type: String, enum: ASK_DUNCIT_ROLE_KEYS, required: true },
    title: { type: String, default: '' },
    surface: { type: String, enum: ASK_DUNCIT_SURFACES, default: 'MWEB' },
    locale: { type: String, default: '' },
    status: { type: String, enum: CONVERSATION_STATUSES, default: 'ACTIVE' },
    page_route: { type: String, default: '' },
    entity_type: { type: String, default: '' },
    entity_id: { type: String, default: '' },
    summary: { type: String, default: '' },
    summarized_count: { type: Number, default: 0 },
    message_count: { type: Number, default: 0 },
    last_message_at: { type: Date, default: null },
    last_message_preview: { type: String, default: '' },
    generating: { type: Boolean, default: false },
    handover_team: { type: String, enum: [...HANDOVER_TEAMS, null], default: null },
    handover_ticket_id: { type: String, default: null },
    handover_summary: { type: String, default: '' },
    handover_at: { type: Date, default: null },
    out_of_context_count: { type: Number, default: 0 },
    violation_count: { type: Number, default: 0 },
    thumbs_up: { type: Number, default: 0 },
    thumbs_down: { type: Number, default: 0 },
    total_tokens: { type: Number, default: 0 },
    cost_usd: { type: Number, default: 0 },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

conversationSchema.index({ user_id: 1, deleted_at: 1, last_message_at: -1 });
conversationSchema.index({ last_message_at: -1 });
conversationSchema.index({ role_key: 1, created_at: -1 });
conversationSchema.index({ status: 1, last_message_at: -1 });
conversationSchema.index({ title: 'text', last_message_preview: 'text' });

export const AskDuncitConversationModel = model<IAskDuncitConversation>('AskDuncitConversation', conversationSchema);
