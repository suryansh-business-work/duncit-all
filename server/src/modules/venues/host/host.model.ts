import { Schema, model, Types, type Document } from 'mongoose';
import {
  bankAccountSchema,
  blankBankAccount,
  type IBankAccountVerification,
} from '@modules/finance/finance/bankAccount';
import { nextEntityNo } from '@modules/venues/entityIdCounter';

export type HostStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface IHostCategory {
  super_category_id: Types.ObjectId | null;
  category_id: Types.ObjectId | null;
  sub_category_id: Types.ObjectId | null;
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
  request_no: string;
}

export interface IHost extends Document {
  /** Permanent human id (HOST-000001) shown in the Onboarded Hosts table. */
  host_no: string | null;
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
  bank_account: IBankAccountVerification;
  tags: string[];
  // Categories this host is approved to operate in. Seeded from approved Host
  // Requests (one entry per HOSTREQ) and backfilled from historical HostLeads.
  host_categories: IHostCategory[];
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

const hostCategorySchema = new Schema<IHostCategory>(
  {
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    sub_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    super_category_name: { type: String, default: '' },
    category_name: { type: String, default: '' },
    sub_category_name: { type: String, default: '' },
    request_no: { type: String, default: '' },
  },
  { _id: false }
);

const hostSchema = new Schema<IHost>(
  {
    host_no: { type: String, default: null, index: true },
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
    bank_account: { type: bankAccountSchema, default: blankBankAccount },
    tags: { type: [String], default: [] },
    host_categories: { type: [hostCategorySchema], default: [] },
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

// Assign a permanent human id on creation (unique, sequential) — surfaced in the
// Onboarded Hosts table for tracking / search / reporting.
hostSchema.pre('save', async function assignHostNo(this: IHost) {
  if (this.isNew && !this.host_no) this.host_no = await nextEntityNo('HOST', 'host');
});

export const HostModel = model<IHost>('Host', hostSchema);
