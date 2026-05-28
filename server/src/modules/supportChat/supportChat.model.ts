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
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

messageSchema.index({ session_id: 1, created_at: -1 });

export const SupportChatMessageModel = model<ISupportChatMessage>(
  'SupportChatMessage',
  messageSchema
);
