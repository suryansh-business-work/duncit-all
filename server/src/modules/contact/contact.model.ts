import { Schema, model, type Document } from 'mongoose';

export type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED';

export interface IContactSubmission extends Document {
  name: string;
  email: string;
  subject: string;
  message: string;
  attachments: string[];
  status: ContactStatus;
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
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ContactSubmissionModel = model<IContactSubmission>('ContactSubmission', schema);
