import { Schema, model, Types, type Document } from 'mongoose';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type PaymentTargetType = 'POD' | 'PRODUCT' | 'GIFT_CARD' | 'OTHER';

/**
 * Every thing checkout is supposed to do after the money lands, in execution
 * order. They used to be eight unrecorded best-effort calls, so a booking that
 * came out half-built left nothing behind saying which half failed.
 */
export type PaymentStepKey =
  | 'PAYMENT_CAPTURED'
  | 'INVOICE_NUMBER'
  | 'SEATS_CLAIMED'
  | 'MEMBERSHIP'
  | 'TICKET'
  | 'LEADERBOARD_POINTS'
  | 'PRODUCT_ORDERS'
  | 'STOCK_ADJUSTED'
  | 'GIFT_CARD_ISSUED'
  | 'COUPON_REDEEMED'
  | 'COINS_REDEEMED'
  | 'COINS_EARNED'
  | 'BACKOUT_FILL'
  | 'LINK_ATTRIBUTION'
  | 'TICKET_EMAIL'
  | 'INVOICE_PDF'
  | 'RECEIPT_EMAIL'
  | 'GIFT_CARD_EMAIL'
  | 'SHIPMENT'
  /** The one step that belongs to a payment that did NOT book: the buyer being
   * told so. Everything above it runs only when the money landed a booking. */
  | 'PAYMENT_FAILED_NOTICE';

export type PaymentStepStatus = 'PENDING' | 'DONE' | 'SKIPPED' | 'FAILED';

export interface IPaymentStep {
  key: PaymentStepKey;
  status: PaymentStepStatus;
  /** Why it was skipped, or the failure message. Empty when it simply worked. */
  detail: string;
  /** Ids of the documents this step created (membership id, ticket id, order ids...). */
  refs: string[];
  at: Date | null;
}

/**
 * How far finalization got. CORE_DONE means the booking core committed and only
 * the deferred side effects (PDF, email, shipment) are outstanding; FAILED means
 * the core rolled back and Finance has money to answer for.
 */
export type PaymentFinalizeState = 'NOT_STARTED' | 'CORE_DONE' | 'COMPLETE' | 'FAILED';

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
  /** Duncit Coins the buyer spent on this payment (1 coin = 1 rupee off). Like
   * the coupon, they cut the gross before GST, so total == amount charged. */
  coins_redeemed: number;
  status: PaymentStatus;
  gateway: string;
  gateway_ref: string | null;
  paid_at: Date | null;
  metadata: Record<string, any>;
  steps: IPaymentStep[];
  finalize_state: PaymentFinalizeState;
  finalize_attempts: number;
  finalized_at: Date | null;
  finalize_error: string | null;
  /** Money captured but the booking core could not be written — Finance must refund. */
  needs_refund: boolean;
  /** Duncit Coins this payment earned the buyer (mirror of the CREDIT ledger row). */
  coins_earned: number;
  /** When the reconciler's capture sweep last looked at this payment. It is the
   * sweep's cursor: without it the batch limit pins every sweep to the same
   * newest rows and anything behind them ages out of the window unexamined. */
  reconcile_checked_at: Date | null;
  /** When a phase-2 run last claimed this payment. The lease that stops the
   * fire-and-forget run and the reconciler's sweep from both booking the same
   * shipment or sending the same receipt twice. */
  side_effects_lease_at: Date | null;
  /** How many times the reconciler has re-run phase 2 for this payment. Its
   * retry budget: a step that fails permanently (a dead courier credential, an
   * address the mail server rejects) would otherwise re-hit that service every
   * five minutes forever and, inside a bounded batch, hold newer payments back. */
  side_effect_attempts: number;
  created_at: Date;
  updated_at: Date;
}

// The finalization audit trail. Stored on the payment rather than in its own
// collection because a step only means anything next to the money that caused
// it, and Finance reads them together on the Payment Logs detail page.
const paymentStepSchema = new Schema<IPaymentStep>(
  {
    key: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'DONE', 'SKIPPED', 'FAILED'], default: 'PENDING' },
    detail: { type: String, default: '' },
    refs: { type: [String], default: [] },
    at: { type: Date, default: null },
  },
  { _id: false }
);

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
    target_type: { type: String, enum: ['POD', 'PRODUCT', 'GIFT_CARD', 'OTHER'], default: 'POD' },
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
    coins_redeemed: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'], default: 'PENDING' },
    gateway: { type: String, default: 'DUMMY' },
    gateway_ref: { type: String, default: null },
    paid_at: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    steps: { type: [paymentStepSchema], default: [] },
    finalize_state: {
      type: String,
      enum: ['NOT_STARTED', 'CORE_DONE', 'COMPLETE', 'FAILED'],
      default: 'NOT_STARTED',
    },
    finalize_attempts: { type: Number, default: 0 },
    finalized_at: { type: Date, default: null },
    finalize_error: { type: String, default: null },
    needs_refund: { type: Boolean, default: false },
    coins_earned: { type: Number, default: 0, min: 0 },
    reconcile_checked_at: { type: Date, default: null },
    side_effects_lease_at: { type: Date, default: null },
    side_effect_attempts: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

paymentSchema.index({ status: 1, created_at: -1 });
// The reconciler's sweep: every payment stuck short of COMPLETE, newest first.
paymentSchema.index({ finalize_state: 1, created_at: -1 });

export const PaymentModel = model<IPayment>('Payment', paymentSchema);
