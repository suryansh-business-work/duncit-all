import { Schema, model, Types, type Document } from 'mongoose';

/**
 * The money-out records shared by withdrawals and Send Money: the payout state
 * both carry, the append-only audit trail, and the manual transfer itself.
 *
 * Three states are kept APART on purpose, because Finance reads them
 * separately and one must never imply another:
 *   - the DECISION (approved / partially approved / rejected) — a human's call,
 *   - the PAYOUT (processing / paid / failed) — what the bank says,
 *   - and, for a withdrawal, the legacy `status` the apps already read.
 * A payout can fail after an approval; an approval is not a payment.
 */

export const PAYOUT_STATES = ['PROCESSING', 'PAID', 'FAILED'] as const;
export type PayoutState = (typeof PAYOUT_STATES)[number];

export const APPROVAL_STATES = ['PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'] as const;
export type ApprovalState = (typeof APPROVAL_STATES)[number];

/** Who a payout is for. PAYROLL is one salary line of a released HR payroll run. */
export type PayoutSubjectKind = 'WITHDRAWAL' | 'SEND_MONEY' | 'PAYROLL';

/** What the bank and Razorpay have said about one payout, and who started it. */
export interface IPayoutState {
  status: PayoutState;
  razorpay_contact_id: string;
  razorpay_fund_account_id: string;
  razorpay_payout_id: string;
  /** Bank reference (UTR / RRN) — only once the bank has it. */
  utr: string;
  failure_reason: string;
  /** Which send this is. Part of the idempotency key, so a retry is a new, deliberate payout. */
  attempt: number;
  idempotency_key: string;
  initiated_by: Types.ObjectId | null;
  initiated_at: Date | null;
  completed_at: Date | null;
}

export const payoutStateSchema = new Schema<IPayoutState>(
  {
    status: { type: String, enum: PAYOUT_STATES, required: true },
    razorpay_contact_id: { type: String, default: '' },
    razorpay_fund_account_id: { type: String, default: '' },
    razorpay_payout_id: { type: String, default: '', index: true },
    utr: { type: String, default: '' },
    failure_reason: { type: String, default: '', maxlength: 500 },
    attempt: { type: Number, default: 1, min: 1 },
    idempotency_key: { type: String, default: '' },
    initiated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    initiated_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },
  },
  { _id: false }
);

// --- Audit trail ------------------------------------------------------------

export const PAYOUT_ACTIONS = [
  'WITHDRAWAL_REQUESTED',
  'APPROVED',
  'PARTIALLY_APPROVED',
  'REJECTED',
  'MARKED_PAID_MANUALLY',
  'TRANSFER_CREATED',
  'PAYOUT_SENT',
  'PAYOUT_RETRIED',
  'PAYOUT_PAID',
  'PAYOUT_FAILED',
] as const;
export type PayoutAction = (typeof PAYOUT_ACTIONS)[number];

export interface IPayoutEvent extends Document {
  subject_kind: PayoutSubjectKind;
  /** withdrawal_id, transfer_id, or a payroll line's line_ref. */
  subject_id: string;
  action: PayoutAction;
  user_id: Types.ObjectId;
  user_name: string;
  requested_amount: number;
  approved_amount: number | null;
  reason: string;
  /** Null when the system acted (a webhook), which is why the name is stored too. */
  actor_id: Types.ObjectId | null;
  actor_name: string;
  actor_role: string;
  payment_status: string;
  razorpay_payout_id: string;
  utr: string;
  /** Razorpay event id, or the action's own key — a redelivery cannot write a second row. */
  dedupe_key: string;
  created_at: Date;
}

const IMMUTABLE_MESSAGE = 'Payout audit entries are append-only and cannot be changed or removed.';

const payoutEventSchema = new Schema<IPayoutEvent>(
  {
    subject_kind: { type: String, enum: ['WITHDRAWAL', 'SEND_MONEY', 'PAYROLL'], required: true, index: true },
    subject_id: { type: String, required: true, index: true },
    action: { type: String, enum: PAYOUT_ACTIONS, required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user_name: { type: String, default: '', maxlength: 160 },
    requested_amount: { type: Number, required: true, min: 0 },
    approved_amount: { type: Number, default: null, min: 0 },
    reason: { type: String, default: '', maxlength: 500 },
    actor_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actor_name: { type: String, default: '', maxlength: 160 },
    actor_role: { type: String, default: '', maxlength: 60 },
    payment_status: { type: String, default: '' },
    razorpay_payout_id: { type: String, default: '' },
    utr: { type: String, default: '' },
    dedupe_key: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, strict: true }
);
payoutEventSchema.index({ subject_kind: 1, created_at: -1 });

// Append-only, enforced where the data lives rather than trusted to callers: a
// financial audit trail that any code path can rewrite is not one.
payoutEventSchema.pre('save', function (next) {
  if (!this.isNew) return next(new Error(IMMUTABLE_MESSAGE));
  next();
});
for (const op of [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
] as const) {
  payoutEventSchema.pre(op, function (next) {
    next(new Error(IMMUTABLE_MESSAGE));
  });
}

export const PayoutEventModel = model<IPayoutEvent>('PayoutEvent', payoutEventSchema);

// --- Send Money -------------------------------------------------------------

export const SEND_MONEY_CATEGORIES = ['SALARY', 'REFUND', 'REIMBURSEMENT', 'ADJUSTMENT', 'OTHER'] as const;
export type SendMoneyCategory = (typeof SEND_MONEY_CATEGORIES)[number];

/**
 * Whose verified record the destination account came from, or CUSTOM when Finance
 * typed the account in for this one transfer (and confirmed they checked it).
 */
export const ACCOUNT_SOURCES = ['HOST', 'VENUE', 'ECOMM_BRAND', 'CUSTOM'] as const;
export type AccountSource = (typeof ACCOUNT_SOURCES)[number];

export interface ISendMoneyTransfer extends Document {
  transfer_id: string;
  /** Minted by the form when it opens, so a double click or a retry cannot send twice. */
  request_id: string;
  recipient_user_id: Types.ObjectId;
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  amount: number;
  category: SendMoneyCategory;
  reason: string;
  notes: string;
  supporting_reference: string;
  supporting_url: string;
  payout_method: 'UPI' | 'IMPS' | 'NEFT';
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
  account_source: AccountSource;
  initiated_by: Types.ObjectId;
  initiated_by_name: string;
  approved_by: Types.ObjectId | null;
  approved_by_name: string;
  payout: IPayoutState;
  created_at: Date;
  updated_at: Date;
}

const sendMoneySchema = new Schema<ISendMoneyTransfer>(
  {
    transfer_id: { type: String, required: true, unique: true },
    request_id: { type: String, required: true, unique: true },
    recipient_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient_name: { type: String, default: '', maxlength: 160 },
    recipient_email: { type: String, default: '', lowercase: true, trim: true },
    recipient_phone: { type: String, default: '', trim: true },
    amount: { type: Number, required: true, min: 1 },
    category: { type: String, enum: SEND_MONEY_CATEGORIES, required: true, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 300 },
    notes: { type: String, default: '', trim: true, maxlength: 1000 },
    supporting_reference: { type: String, default: '', trim: true, maxlength: 120 },
    supporting_url: { type: String, default: '', trim: true, maxlength: 500 },
    payout_method: { type: String, enum: ['UPI', 'IMPS', 'NEFT'], required: true },
    account_holder_name: { type: String, default: '', trim: true, maxlength: 120 },
    account_number: { type: String, default: '', trim: true, maxlength: 40 },
    ifsc_code: { type: String, default: '', trim: true, maxlength: 20 },
    upi_id: { type: String, default: '', trim: true, maxlength: 120 },
    account_source: { type: String, enum: ACCOUNT_SOURCES, required: true },
    initiated_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    initiated_by_name: { type: String, default: '', maxlength: 160 },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approved_by_name: { type: String, default: '', maxlength: 160 },
    payout: { type: payoutStateSchema, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
sendMoneySchema.index({ created_at: -1 });
sendMoneySchema.index({ 'payout.status': 1, created_at: -1 });

export const SendMoneyTransferModel = model<ISendMoneyTransfer>('SendMoneyTransfer', sendMoneySchema);
