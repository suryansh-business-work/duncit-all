import { Schema, model, Types, type Document } from 'mongoose';

export type HostStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface IHost extends Document {
  user_id: Types.ObjectId;
  // Step 1: Personal
  full_name: string;
  email: string;
  phone: string;
  dob: Date | null;
  // Step 2: Identity
  aadhar_number: string;
  pan_number: string;
  passport_photo_url: string;
  // Step 3: Verification
  police_verification_url: string;
  full_address: string;
  tags: string[];
  // Step 4: Confirmation handled by submit
  step_completed: number;
  status: HostStatus;
  is_active: boolean;
  reviewer_notes: string;
  submitted_at: Date | null;
  approved_at: Date | null;
  rejected_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const hostSchema = new Schema<IHost>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    full_name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    dob: { type: Date, default: null },
    aadhar_number: { type: String, default: '' },
    pan_number: { type: String, default: '' },
    passport_photo_url: { type: String, default: '' },
    police_verification_url: { type: String, default: '' },
    full_address: { type: String, default: '' },
    tags: { type: [String], default: [] },
    step_completed: { type: Number, default: 0, min: 0, max: 4 },
    status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'], default: 'DRAFT' },
    is_active: { type: Boolean, default: true },
    reviewer_notes: { type: String, default: '' },
    submitted_at: { type: Date, default: null },
    approved_at: { type: Date, default: null },
    rejected_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const HostModel = model<IHost>('Host', hostSchema);
