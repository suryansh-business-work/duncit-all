import { Schema, model, type Document, Types } from 'mongoose';

export type InterviewType = 'HOST' | 'VENUE';
export type InterviewStatus = 'PENDING' | 'SCHEDULED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface IInterviewSlot {
  start: Date;
  end: Date;
}

export interface IInterview extends Document {
  type: InterviewType;
  applicant_user_id: Types.ObjectId;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  about: string;
  business_name?: string | null;
  business_address?: string | null;
  city?: string | null;
  zone?: string | null;
  preferred_slots: IInterviewSlot[];
  scheduled_slot?: IInterviewSlot | null;
  status: InterviewStatus;
  meeting_link?: string | null;
  admin_notes?: string | null;
  created_at: Date;
  updated_at: Date;
}

const slotSchema = new Schema<IInterviewSlot>(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  { _id: false }
);

const interviewSchema = new Schema<IInterview>(
  {
    type: { type: String, enum: ['HOST', 'VENUE'], required: true },
    applicant_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    applicant_name: { type: String, required: true, trim: true },
    applicant_email: { type: String, required: true, trim: true, lowercase: true },
    applicant_phone: { type: String, required: true, trim: true },
    about: { type: String, required: true, trim: true },
    business_name: { type: String, default: null, trim: true },
    business_address: { type: String, default: null, trim: true },
    city: { type: String, default: null, trim: true },
    zone: { type: String, default: null, trim: true },
    preferred_slots: { type: [slotSchema], default: [] },
    scheduled_slot: { type: slotSchema, default: null },
    status: {
      type: String,
      enum: ['PENDING', 'SCHEDULED', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
    },
    meeting_link: { type: String, default: null },
    admin_notes: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

interviewSchema.index({ status: 1, type: 1, created_at: -1 });

export const InterviewModel = model<IInterview>('Interview', interviewSchema);
