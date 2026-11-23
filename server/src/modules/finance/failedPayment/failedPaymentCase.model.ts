import { Schema, model, Types, type Document } from 'mongoose';
import {
  CASE_SOURCES,
  EVIDENCE_KINDS,
  EVIDENCE_TYPES,
  REFUND_STATUSES,
  RESOLUTION_STATES,
  REVIEW_DECISIONS,
  VERIFICATION_STATUSES,
  type CaseRefundStatus,
  type CaseSource,
  type EvidenceKind,
  type EvidenceType,
  type ResolutionState,
  type ReviewDecision,
  type VerificationStatus,
} from './failedPayment.types';
import { aiSummarySchema, type ICaseAiSummary } from './failedPaymentAiSummary.model';

/**
 * One payment that did not end in a booking, as Finance works it: who and what
 * it was for, what Razorpay said, what the buyer sent as proof, what the check
 * concluded, Finance's decision and the refund. Exactly one per payment.
 *
 * Money is held two ways on purpose: `amount` mirrors the payment's rupee total
 * for display, while everything sent to Razorpay is worked out in integer paise
 * (`refund.amount_paise`) so no float ever decides what leaves the account.
 */

export interface ICaseError {
  code: string;
  description: string;
  reason: string;
  source: string;
  step: string;
  reported_by: string;
  at: Date | null;
}

export interface IEvidenceFile {
  file_ref: string;
  mime: string;
  kind: EvidenceKind;
}

export interface ICaseClaim {
  evidence_type: EvidenceType;
  files: IEvidenceFile[];
  transaction_id: string;
  client_request_id: string;
  submitted_at: Date;
}

export interface ICaseVerification {
  status: VerificationStatus;
  run_id: string;
  confidence: number | null;
  extracted: {
    payment_id: string;
    utr: string;
    amount: number | null;
    date: string;
    status: string;
    payee: string;
  } | null;
  matched_fields: string[];
  matched_payment_id: string;
  razorpay_status: string;
  razorpay_amount: number | null;
  checked_at: Date | null;
  notes: string;
}

export interface ICaseReview {
  decision: ReviewDecision;
  note: string;
  by: string;
  by_name: string;
  client_request_id: string;
  at: Date;
}

export interface ICaseRefund {
  status: CaseRefundStatus;
  razorpay_refund_id: string;
  razorpay_payment_id: string;
  amount_paise: number;
  attempts: number;
  client_request_id: string;
  claimed_at: Date | null;
  attempted_at: Date | null;
  refunded_at: Date | null;
  error: string;
  initiated_by: string;
  initiated_by_name: string;
  finance_recorded: boolean;
}

export interface ICaseResolution {
  state: ResolutionState;
  at: Date | null;
  by: string;
  by_name: string;
  note: string;
  client_request_id: string;
}

export interface IFailedPaymentCase extends Document {
  payment_doc_id: Types.ObjectId;
  payment_id: string;
  user_id: Types.ObjectId | null;
  user_name: string;
  user_email: string;
  user_phone: string;
  pod_id: Types.ObjectId | null;
  pod_title: string;
  amount: number;
  currency_symbol: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  latest_error: ICaseError | null;
  retry_shown: boolean;
  attempts: number;
  sources: CaseSource[];
  claims: ICaseClaim[];
  ticket_id: Types.ObjectId | null;
  ticket_no: string;
  /** Held while a claim opens the ticket, so two claims at once open one. */
  ticket_lock_at: Date | null;
  verification: ICaseVerification;
  review: ICaseReview | null;
  refund: ICaseRefund;
  resolution: ICaseResolution;
  /** The AI's last refund note; null until someone asks for one. */
  ai_summary: ICaseAiSummary | null;
  revision: number;
  created_at: Date;
  updated_at: Date;
}

const errorSchema = new Schema<ICaseError>(
  {
    code: { type: String, default: '', maxlength: 120 },
    description: { type: String, default: '', maxlength: 500 },
    reason: { type: String, default: '', maxlength: 200 },
    source: { type: String, default: '', maxlength: 120 },
    step: { type: String, default: '', maxlength: 120 },
    reported_by: { type: String, default: '' },
    at: { type: Date, default: null },
  },
  { _id: false }
);

const fileSchema = new Schema<IEvidenceFile>(
  {
    file_ref: { type: String, required: true, maxlength: 1000 },
    mime: { type: String, default: '' },
    kind: { type: String, enum: EVIDENCE_KINDS, default: 'OTHER' },
  },
  { _id: false }
);

const claimSchema = new Schema<ICaseClaim>(
  {
    evidence_type: { type: String, enum: EVIDENCE_TYPES, required: true },
    files: { type: [fileSchema], default: [] },
    transaction_id: { type: String, default: '', maxlength: 60 },
    client_request_id: { type: String, default: '', maxlength: 100 },
    submitted_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const verificationSchema = new Schema<ICaseVerification>(
  {
    status: { type: String, enum: VERIFICATION_STATUSES, default: 'PENDING' },
    run_id: { type: String, default: '' },
    confidence: { type: Number, default: null },
    extracted: { type: Schema.Types.Mixed, default: null },
    matched_fields: { type: [String], default: [] },
    matched_payment_id: { type: String, default: '' },
    razorpay_status: { type: String, default: '' },
    razorpay_amount: { type: Number, default: null },
    checked_at: { type: Date, default: null },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { _id: false }
);

const reviewSchema = new Schema<ICaseReview>(
  {
    decision: { type: String, enum: REVIEW_DECISIONS, required: true },
    note: { type: String, default: '', maxlength: 1000 },
    by: { type: String, default: '' },
    by_name: { type: String, default: '' },
    client_request_id: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const refundSchema = new Schema<ICaseRefund>(
  {
    status: { type: String, enum: REFUND_STATUSES, default: '' },
    razorpay_refund_id: { type: String, default: '' },
    razorpay_payment_id: { type: String, default: '' },
    amount_paise: { type: Number, default: 0, min: 0 },
    attempts: { type: Number, default: 0, min: 0 },
    client_request_id: { type: String, default: '' },
    claimed_at: { type: Date, default: null },
    attempted_at: { type: Date, default: null },
    refunded_at: { type: Date, default: null },
    error: { type: String, default: '', maxlength: 1000 },
    initiated_by: { type: String, default: '' },
    initiated_by_name: { type: String, default: '' },
    finance_recorded: { type: Boolean, default: false },
  },
  { _id: false }
);

const resolutionSchema = new Schema<ICaseResolution>(
  {
    state: { type: String, enum: RESOLUTION_STATES, default: 'OPEN' },
    at: { type: Date, default: null },
    by: { type: String, default: '' },
    by_name: { type: String, default: '' },
    note: { type: String, default: '', maxlength: 1000 },
    client_request_id: { type: String, default: '' },
  },
  { _id: false }
);

const failedPaymentCaseSchema = new Schema<IFailedPaymentCase>(
  {
    payment_doc_id: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
    payment_id: { type: String, default: '' },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    user_name: { type: String, default: '' },
    user_email: { type: String, default: '' },
    user_phone: { type: String, default: '' },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null },
    pod_title: { type: String, default: '' },
    amount: { type: Number, default: 0, min: 0 },
    currency_symbol: { type: String, default: '₹' },
    razorpay_order_id: { type: String, default: '', index: true },
    razorpay_payment_id: { type: String, default: '' },
    latest_error: { type: errorSchema, default: null },
    retry_shown: { type: Boolean, default: false },
    attempts: { type: Number, default: 0, min: 0 },
    sources: { type: [String], enum: CASE_SOURCES, default: [] },
    claims: { type: [claimSchema], default: [] },
    ticket_id: { type: Schema.Types.ObjectId, ref: 'Ticket', default: null },
    ticket_no: { type: String, default: '' },
    ticket_lock_at: { type: Date, default: null },
    verification: { type: verificationSchema, default: () => ({}) },
    review: { type: reviewSchema, default: null },
    refund: { type: refundSchema, default: () => ({}) },
    resolution: { type: resolutionSchema, default: () => ({}) },
    ai_summary: { type: aiSummarySchema, default: null },
    revision: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Finance › Failed Payments, newest first, usually narrowed by one status.
failedPaymentCaseSchema.index({ created_at: -1 });
failedPaymentCaseSchema.index({ 'resolution.state': 1, created_at: -1 });
failedPaymentCaseSchema.index({ 'verification.status': 1, created_at: -1 });
// The pending-refund poller. PARTIAL: only refunds in flight.
failedPaymentCaseSchema.index(
  { 'refund.claimed_at': 1 },
  { partialFilterExpression: { 'refund.status': 'PENDING' } }
);

export const FailedPaymentCaseModel = model<IFailedPaymentCase>('FailedPaymentCase', failedPaymentCaseSchema);
