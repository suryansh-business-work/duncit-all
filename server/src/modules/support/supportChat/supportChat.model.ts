import { Schema, model, Types, type Document } from 'mongoose';

export type SupportChatStatus = 'OPEN' | 'CLOSED';
export type SupportChatSenderRole = 'USER' | 'AGENT' | 'SYSTEM';

export interface ISupportChatSession extends Document {
  user_id: Types.ObjectId;
  agent_id: Types.ObjectId | null;
  status: SupportChatStatus;
  last_message_at: Date;
  last_message_preview: string;
  unread_for_agent: number;
  unread_for_user: number;
  /** When each side last opened the chat — drives the "Seen" (blue tick) state. */
  user_last_read_at: Date | null;
  agent_last_read_at: Date | null;
  /** The AI assistant answers first; cleared once a human takes over. */
  ai_active: boolean;
  handed_off: boolean;
  /** Optional satisfaction feedback once the chat is resolved. */
  rating: number | null;
  feedback_comment: string;
  feedback_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const sessionSchema = new Schema<ISupportChatSession>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agent_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN', index: true },
    last_message_at: { type: Date, default: Date.now, index: true },
    last_message_preview: { type: String, default: '' },
    unread_for_agent: { type: Number, default: 0 },
    unread_for_user: { type: Number, default: 0 },
    user_last_read_at: { type: Date, default: null },
    agent_last_read_at: { type: Date, default: null },
    ai_active: { type: Boolean, default: true },
    handed_off: { type: Boolean, default: false },
    rating: { type: Number, default: null, min: 1, max: 5 },
    feedback_comment: { type: String, default: '', maxlength: 1000 },
    feedback_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

sessionSchema.index({ status: 1, last_message_at: -1 });

export const SupportChatSessionModel = model<ISupportChatSession>(
  'SupportChatSession',
  sessionSchema
);

export interface ISupportChatMessage extends Document {
  session_id: Types.ObjectId;
  sender_id: Types.ObjectId;
  sender_role: SupportChatSenderRole;
  sender_name: string;
  sender_photo: string;
  text: string;
  attachments: string[];
  /** AGENT-role messages authored by the AI assistant rather than a human. */
  is_ai: boolean;
  created_at: Date;
}

const messageSchema = new Schema<ISupportChatMessage>(
  {
    session_id: { type: Schema.Types.ObjectId, ref: 'SupportChatSession', required: true, index: true },
    sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender_role: { type: String, enum: ['USER', 'AGENT', 'SYSTEM'], required: true },
    sender_name: { type: String, default: '' },
    sender_photo: { type: String, default: '' },
    text: { type: String, default: '' },
    attachments: { type: [String], default: [] },
    is_ai: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

messageSchema.index({ session_id: 1, created_at: -1 });

export const SupportChatMessageModel = model<ISupportChatMessage>(
  'SupportChatMessage',
  messageSchema
);
