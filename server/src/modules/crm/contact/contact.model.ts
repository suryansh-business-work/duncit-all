import { Schema, model, Types, type Document } from 'mongoose';

export type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED';

export interface IContactSubmission extends Document {
  name: string;
  email: string;
  subject: string;
  message: string;
  attachments: string[];
  status: ContactStatus;
  /**
   * The Support ticket raised for this message, when one was.
   *
   * Raising it is best-effort — the visitor is never blocked by a queue write
   * failing — so this is what makes a message that never reached Support
   * visible in the data itself, instead of only in a log line nobody reads.
   */
  ticket_id: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const schema = new Schema<IContactSubmission>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    subject: { type: String, default: '', trim: true },
    message: { type: String, required: true },
    attachments: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'],
      default: 'NEW',
      index: true,
    },
    // Indexed because the question asked of it is "which submissions have none".
    ticket_id: { type: Schema.Types.ObjectId, ref: 'Ticket', default: null, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ContactSubmissionModel = model<IContactSubmission>('ContactSubmission', schema);
