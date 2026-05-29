import { Schema, model, Types, type Document } from 'mongoose';

export type PaymentReleaseKind = 'VENUE_BILLING' | 'HOST_PAYMENT';
export type PaymentReleaseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PaymentReleaseApprovalType = 'FULL' | 'PARTIAL';

export interface IPaymentReleaseMedia {
  url: string;
  type: 'IMAGE' | 'VIDEO';
}

export interface IPaymentRelease extends Document {
  release_id: string;
  kind: PaymentReleaseKind;
  status: PaymentReleaseStatus;
  pod_id: Types.ObjectId;
  pod_title: string;
  venue_id?: Types.ObjectId | null;
  host_user_id?: Types.ObjectId | null;
  beneficiary_name: string;
  beneficiary_email: string;
  amount_requested: number;
  bill_url: string;
  evidence_media: IPaymentReleaseMedia[];
  notes: string;
  requested_by?: Types.ObjectId | null;
  requested_at: Date;
  reviewed_by?: Types.ObjectId | null;
  reviewed_at?: Date | null;
  approval_type?: PaymentReleaseApprovalType | null;
  approved_amount?: number | null;
  approval_reason?: string;
  created_at: Date;
  updated_at: Date;
}

const releaseMediaSchema = new Schema<IPaymentReleaseMedia>(
  {
    url: { type: String, required: true, trim: true },
    type: { type: String, enum: ['IMAGE', 'VIDEO'], default: 'IMAGE' },
  },
  { _id: false }
);

const paymentReleaseSchema = new Schema<IPaymentRelease>(
  {
    release_id: { type: String, required: true, unique: true, index: true },
    kind: { type: String, enum: ['VENUE_BILLING', 'HOST_PAYMENT'], required: true, index: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true, index: true },
    pod_title: { type: String, required: true, trim: true },
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', default: null, index: true },
    host_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    beneficiary_name: { type: String, required: true, trim: true },
    beneficiary_email: { type: String, required: true, trim: true, lowercase: true },
    amount_requested: { type: Number, required: true, min: 0 },
    bill_url: { type: String, default: '', trim: true },
    evidence_media: { type: [releaseMediaSchema], default: [] },
    notes: { type: String, default: '', trim: true, maxlength: 2000 },
    requested_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    requested_at: { type: Date, default: () => new Date() },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
    approval_type: { type: String, enum: ['FULL', 'PARTIAL'], default: null },
    approved_amount: { type: Number, default: null, min: 0 },
    approval_reason: { type: String, default: '', trim: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

paymentReleaseSchema.index({ status: 1, created_at: -1 });
paymentReleaseSchema.index({ pod_id: 1, kind: 1, status: 1 });

export const PaymentReleaseModel = model<IPaymentRelease>('PaymentRelease', paymentReleaseSchema);