import { Schema, model, Types, type Document } from 'mongoose';
import { WITHDRAWER_ROLES, type WithdrawerRole } from '@modules/finance/finance/finance.model';
import type { PaymentReleaseKind } from '@modules/finance/finance/paymentRelease.model';

export type WalletTxnType = 'CREDIT' | 'DEBIT';
export type WalletTxnSource = 'POD_COMPLETION' | 'WITHDRAWAL' | 'WITHDRAWAL_REVERSAL';
export type WithdrawalStatus = 'PENDING' | 'PAID' | 'REJECTED';
export type WithdrawalMethod = 'UPI' | 'IMPS' | 'NEFT';

export interface IWallet extends Document {
  user_id: Types.ObjectId;
  balance: number;
  currency_symbol: string;
  created_at: Date;
  updated_at: Date;
}

export interface IWalletTransaction extends Document {
  user_id: Types.ObjectId;
  type: WalletTxnType;
  amount: number;
  balance_after: number;
  source: WalletTxnSource;
  reason: string;
  pod_id?: Types.ObjectId | null;
  release_id?: string | null;
  withdrawal_id?: string | null;
  created_at: Date;
}

/**
 * Which pod's earnings a slice of a withdrawal came from.
 *
 * A withdrawal is one debit against a fungible aggregate balance, so nothing in
 * the ledger inherently says "this ₹359 was pod P's money". This array is that
 * answer, decided ONCE at request time by walking the withdrawer's un-withdrawn
 * pod credits oldest-first, and never recomputed — a later reversal must not
 * silently re-attribute a payout Finance has already actioned.
 *
 * `kind` is the payout leg the money was earned through, which is what the
 * Finance pod view reports as the withdrawer's role. It is deliberately NOT the
 * withdrawal's own `withdrawer_role`: that is one global capacity per user, so a
 * host who also owns a venue would otherwise read the same on both their pods.
 */
export interface IWithdrawalAllocation {
  pod_id: Types.ObjectId;
  pod_title: string;
  release_id: string;
  kind: PaymentReleaseKind;
  amount: number;
}

/**
 * The payout leg a pod's money was earned through -> the capacity it is
 * withdrawn in. ONE definition, because both the per-withdrawal view and the
 * pod-grouped list answer "which partner is this?" from it.
 *
 * This is per-pod and exact, unlike the withdrawal's own `withdrawer_role`,
 * which resolves ONE capacity per user by fixed precedence and therefore
 * mislabels anyone who earns in two (a host who also owns the venue).
 */
export const WITHDRAWER_ROLE_BY_KIND: Record<PaymentReleaseKind, WithdrawerRole> = {
  HOST_PAYMENT: 'HOST',
  VENUE_BILLING: 'VENUE_OWNER',
  CLUB_ADMIN: 'CLUB_ADMIN',
  ECOMM_PAYMENT: 'ECOMM_MANAGER',
};

export interface IWalletWithdrawal extends Document {
  withdrawal_id: string;
  user_id: Types.ObjectId;
  beneficiary_name: string;
  beneficiary_email: string;
  amount: number;
  withdrawer_role: WithdrawerRole;
  status: WithdrawalStatus;
  payout_method: WithdrawalMethod;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
  scheduled_for: Date;
  reject_reason: string;
  requested_at: Date;
  allocations: Types.DocumentArray<IWithdrawalAllocation & Types.Subdocument>;
  reviewed_by?: Types.ObjectId | null;
  reviewed_at?: Date | null;
  paid_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    balance: { type: Number, default: 0, min: 0 },
    currency_symbol: { type: String, default: '₹' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const txnSchema = new Schema<IWalletTransaction>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    amount: { type: Number, required: true, min: 0 },
    balance_after: { type: Number, required: true, min: 0 },
    source: { type: String, enum: ['POD_COMPLETION', 'WITHDRAWAL', 'WITHDRAWAL_REVERSAL'], required: true },
    reason: { type: String, default: '', trim: true, maxlength: 300 },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null },
    release_id: { type: String, default: null, index: true },
    withdrawal_id: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
txnSchema.index({ user_id: 1, created_at: -1 });

const allocationSchema = new Schema<IWithdrawalAllocation>(
  {
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true },
    // Denormalised so the Finance pod list never loses a row's title to a
    // soft-deleted pod, and never needs a lookup to render.
    pod_title: { type: String, default: '', trim: true, maxlength: 200 },
    release_id: { type: String, default: '', trim: true },
    kind: {
      type: String,
      enum: ['VENUE_BILLING', 'HOST_PAYMENT', 'CLUB_ADMIN', 'ECOMM_PAYMENT'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const withdrawalSchema = new Schema<IWalletWithdrawal>(
  {
    withdrawal_id: { type: String, required: true, unique: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    beneficiary_name: { type: String, default: '', trim: true, maxlength: 160 },
    beneficiary_email: { type: String, default: '', trim: true, lowercase: true },
    amount: { type: Number, required: true, min: 1 },
    // The capacity the money was withdrawn in. STAMPED AT REQUEST TIME and never
    // resolved live: a withdrawal is a payout record, and which capacity someone
    // withdrew in must not change if their roles change later. Indexed because
    // the Finance withdrawals table filters on it.
    withdrawer_role: { type: String, enum: WITHDRAWER_ROLES, default: 'HOST', index: true },
    status: { type: String, enum: ['PENDING', 'PAID', 'REJECTED'], default: 'PENDING', index: true },
    payout_method: { type: String, enum: ['UPI', 'IMPS', 'NEFT'], default: 'UPI' },
    account_holder_name: { type: String, default: '', trim: true, maxlength: 120 },
    account_number: { type: String, default: '', trim: true, maxlength: 40 },
    ifsc_code: { type: String, default: '', trim: true, maxlength: 20 },
    upi_id: { type: String, default: '', trim: true, maxlength: 120 },
    scheduled_for: { type: Date, required: true },
    reject_reason: { type: String, default: '', trim: true, maxlength: 500 },
    requested_at: { type: Date, default: () => new Date() },
    allocations: { type: [allocationSchema], default: [] },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
    paid_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
withdrawalSchema.index({ status: 1, created_at: -1 });
// The Finance pod drill-down reads every withdrawal attributed to one pod.
withdrawalSchema.index({ 'allocations.pod_id': 1, status: 1 });

export const WalletModel = model<IWallet>('Wallet', walletSchema);
export const WalletTransactionModel = model<IWalletTransaction>('WalletTransaction', txnSchema);
export const WalletWithdrawalModel = model<IWalletWithdrawal>('WalletWithdrawal', withdrawalSchema);
