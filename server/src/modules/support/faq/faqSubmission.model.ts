import { Schema, model, type Document } from 'mongoose';

export type FaqSubmissionStatus = 'NEW' | 'CONVERTED' | 'IGNORED';

export interface IFaqSubmission extends Document {
  question: string;
  email: string | null;
  super_category_slug: string | null;
  status: FaqSubmissionStatus;
  converted_faq_id: Schema.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const schema = new Schema<IFaqSubmission>(
  {
    question: { type: String, required: true, trim: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    super_category_slug: { type: String, default: null, lowercase: true, trim: true, index: true },
    status: {
      type: String,
      enum: ['NEW', 'CONVERTED', 'IGNORED'],
      default: 'NEW',
      index: true,
    },
    converted_faq_id: { type: Schema.Types.ObjectId, ref: 'Faq', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const FaqSubmissionModel = model<IFaqSubmission>('FaqSubmission', schema);
