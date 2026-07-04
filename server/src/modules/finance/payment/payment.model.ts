import { Schema, model, Types, type Document } from 'mongoose';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type PaymentTargetType = 'POD' | 'OTHER';

export interface IBillingDetails {
  name: string;
  email: string;
  phone: string;
  gstin: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface IPayment extends Document {
  payment_id: string;
  invoice_no: string | null;
  user_id: Types.ObjectId;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  billing_address: string;
  billing: IBillingDetails;
  checkout_url: string;
  target_type: PaymentTargetType;
  pod_id: Types.ObjectId | null;
  description: string;
  subtotal: number;
  platform_fee_pct: number;
  platform_fee_amount: number;
  gst_pct: number;
  gst_amount: number;
  total: number;
  currency_symbol: string;
  coupon_code: string | null;
  coupon_discount: number;
  status: PaymentStatus;
  gateway: string;
  gateway_ref: string | null;
  paid_at: Date | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// Structured billing snapshot — frozen on the payment so the invoice bill-to
// prints the exact address the buyer entered, independent of later profile edits.
const billingSchema = new Schema<IBillingDetails>(
  {
    name: { type: String, default: '', trim: true, maxlength: 160 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, default: '', trim: true, maxlength: 24 },
    gstin: { type: String, default: '', trim: true, uppercase: true, maxlength: 20 },
    line1: { type: String, default: '', trim: true, maxlength: 200 },
    line2: { type: String, default: '', trim: true, maxlength: 200 },
    landmark: { type: String, default: '', trim: true, maxlength: 160 },
    city: { type: String, default: '', trim: true, maxlength: 120 },
    state: { type: String, default: '', trim: true, maxlength: 120 },
    pincode: { type: String, default: '', trim: true, maxlength: 12 },
    country: { type: String, default: 'India', trim: true, maxlength: 80 },
  },
  { _id: false }
);

const paymentSchema = new Schema<IPayment>(
  {
    payment_id: { type: String, required: true, unique: true, index: true },
    invoice_no: { type: String, default: null, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user_name: { type: String, required: true },
    user_email: { type: String, required: true },
    user_phone: { type: String, default: null },
    billing_address: { type: String, default: '' },
    billing: { type: billingSchema, default: () => ({}) },
    checkout_url: { type: String, default: '' },
    target_type: { type: String, enum: ['POD', 'OTHER'], default: 'POD' },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null, index: true },
    description: { type: String, default: '' },
    subtotal: { type: Number, required: true, min: 0 },
    platform_fee_pct: { type: Number, default: 0 },
    platform_fee_amount: { type: Number, default: 0 },
    gst_pct: { type: Number, default: 0 },
    gst_amount: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 0 },
    currency_symbol: { type: String, default: '₹' },
    coupon_code: { type: String, default: null, index: true },
    coupon_discount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'], default: 'PENDING' },
    gateway: { type: String, default: 'DUMMY' },
    gateway_ref: { type: String, default: null },
    paid_at: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

paymentSchema.index({ status: 1, created_at: -1 });

export const PaymentModel = model<IPayment>('Payment', paymentSchema);
