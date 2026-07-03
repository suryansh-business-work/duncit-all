import { Schema, model, Types, type Document } from 'mongoose';

export type JobApplicationStatus = 'NEW' | 'SHORTLISTED' | 'REJECTED' | 'HIRED';

/** A public "apply to open role" submission from the careers pages — triaged
 * in the Website portal (same pattern as contact/FAQ submissions). */
export interface IJobApplication extends Document {
  role_content_id: Types.ObjectId | null; // WebsiteContent (type CAREERS) row, if still present
  role_title: string;
  name: string;
  email: string;
  phone: string;
  resume_url: string; // link to CV/portfolio (drive/LinkedIn/site) — no file upload
  portfolio_url: string;
  cover_note: string;
  status: JobApplicationStatus;
  created_at: Date;
  updated_at: Date;
}

const jobApplicationSchema = new Schema<IJobApplication>(
  {
    role_content_id: { type: Schema.Types.ObjectId, ref: 'WebsiteContent', default: null, index: true },
    role_title: { type: String, required: true, trim: true, maxlength: 160 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, default: '', trim: true, maxlength: 20 },
    resume_url: { type: String, default: '', trim: true, maxlength: 1000 },
    portfolio_url: { type: String, default: '', trim: true, maxlength: 1000 },
    cover_note: { type: String, default: '', trim: true, maxlength: 4000 },
    status: {
      type: String,
      enum: ['NEW', 'SHORTLISTED', 'REJECTED', 'HIRED'],
      default: 'NEW',
      index: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

jobApplicationSchema.index({ created_at: -1 });

export const JobApplicationModel = model<IJobApplication>('JobApplication', jobApplicationSchema);
