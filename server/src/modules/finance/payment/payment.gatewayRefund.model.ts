import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * One refund of a pod payment sent back through Razorpay — a pod cancellation,
 * a Finance refund, or a Backout whose seat was filled.
 *
 * Until this existed those flows only STAMPED the payment refunded and the
 * money was returned by hand, if at all. The stamp still happens (it voids the
 * booking and lists the refund in Finance › User Refund Logs); this record is
 * the money: the request to Razorpay, its refund id, and its real outcome. A
 * gateway accepting a refund is not the money reaching the bank, so the two are
 * different states here.
 *
 * `idempotency_key` names the business event (`pod_cancel:<payment>`,
 * `finance_refund:<payment>`, `backout:<request>`), unique, so a repeated
 * cancellation or a double click can never create a second refund.
 */
export const GATEWAY_REFUND_STATUSES = [
  'QUEUED', // recorded, not sent yet
  'SENDING', // claimed by one worker, the Razorpay call is in flight
  'PROCESSING', // Razorpay accepted it; the bank has not confirmed
  'SUCCEEDED', // Razorpay says processed
  'FAILED', // refused or unknown — retried, the next send adopts any refund that did reach Razorpay
  'RECONCILIATION_REQUIRED', // retries used up — Finance must look at the Razorpay dashboard
  'NOT_APPLICABLE', // no Razorpay money to send back (a test-gateway or offline payment)
] as const;
export type GatewayRefundStatus = (typeof GATEWAY_REFUND_STATUSES)[number];

export const GATEWAY_REFUND_SOURCES = ['POD_CANCELLATION', 'FINANCE_REFUND', 'BACKOUT'] as const;
export type GatewayRefundSource = (typeof GATEWAY_REFUND_SOURCES)[number];

export interface IPaymentGatewayRefund extends Document {
  idempotency_key: string;
  payment_doc_id: Types.ObjectId;
  /** Our DPAY- reference, for logs and the Razorpay notes. */
  payment_id: string;
  pod_id: Types.ObjectId | null;
  user_id: Types.ObjectId | null;
  source: GatewayRefundSource;
  reason: string;
  amount_paise: number;
  razorpay_payment_id: string;
  razorpay_account: string | null;
  status: GatewayRefundStatus;
  razorpay_refund_id: string;
  razorpay_status: string;
  attempts: number;
  last_error: string;
  claimed_at: Date | null;
  next_attempt_at: Date | null;
  requested_at: Date | null;
  processed_at: Date | null;
  initiated_by: string;
  initiator_id: string;
  created_at: Date;
  updated_at: Date;
}

const paymentGatewayRefundSchema = new Schema<IPaymentGatewayRefund>(
  {
    idempotency_key: { type: String, required: true, unique: true, maxlength: 120 },
    payment_doc_id: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    payment_id: { type: String, default: '' },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    source: { type: String, enum: GATEWAY_REFUND_SOURCES, required: true },
    reason: { type: String, default: '', maxlength: 500 },
    amount_paise: { type: Number, required: true, min: 1 },
    razorpay_payment_id: { type: String, default: '' },
    razorpay_account: { type: String, default: null },
    status: { type: String, enum: GATEWAY_REFUND_STATUSES, required: true, index: true },
    razorpay_refund_id: { type: String, default: '', index: true },
    razorpay_status: { type: String, default: '' },
    attempts: { type: Number, default: 0, min: 0 },
    last_error: { type: String, default: '', maxlength: 500 },
    claimed_at: { type: Date, default: null },
    next_attempt_at: { type: Date, default: null },
    requested_at: { type: Date, default: null },
    processed_at: { type: Date, default: null },
    initiated_by: { type: String, default: '' },
    initiator_id: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
// The sweep's two reads: what is due to send, and what is waiting on Razorpay.
paymentGatewayRefundSchema.index({ status: 1, next_attempt_at: 1 });

export const PaymentGatewayRefundModel = model<IPaymentGatewayRefund>(
  'PaymentGatewayRefund',
  paymentGatewayRefundSchema,
  'payment_gateway_refunds'
);
