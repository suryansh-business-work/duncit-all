import { Schema, model, Types, type Document } from 'mongoose';

export type TicketStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TicketCategory =
  | 'GENERAL'
  | 'PAYMENT'
  | 'BOOKING'
  | 'SAFETY'
  | 'TECHNICAL'
  | 'OTHER';
export type TicketAuthorRole = 'USER' | 'AGENT';

export interface ITicketMessage {
  _id: Types.ObjectId;
  author_id: Types.ObjectId;
  author_role: TicketAuthorRole;
  author_name: string;
  author_photo: string;
  body_html: string;
  body_text: string;
  attachments: string[];
  created_at: Date;
}

const messageSchema = new Schema<ITicketMessage>(
  {
    author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    author_role: { type: String, enum: ['USER', 'AGENT'], required: true },
    author_name: { type: String, default: '' },
    author_photo: { type: String, default: '' },
    body_html: { type: String, default: '' },
    body_text: { type: String, default: '' },
    attachments: { type: [String], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export interface ITicket extends Document {
  user_id: Types.ObjectId;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  assignee_id: Types.ObjectId | null;
  last_message_at: Date;
  messages: Types.DocumentArray<ITicketMessage>;
  created_at: Date;
  updated_at: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    category: {
      type: String,
      enum: ['GENERAL', 'PAYMENT', 'BOOKING', 'SAFETY', 'TECHNICAL', 'OTHER'],
      default: 'GENERAL',
      index: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },
    assignee_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    last_message_at: { type: Date, default: Date.now, index: true },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

ticketSchema.index({ status: 1, last_message_at: -1 });

export const TicketModel = model<ITicket>('Ticket', ticketSchema);
