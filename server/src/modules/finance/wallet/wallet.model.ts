import { Schema, model, Types, type Document } from 'mongoose';

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

export interface IWalletWithdrawal extends Document {
  withdrawal_id: string;
  user_id: Types.ObjectId;
  beneficiary_name: string;
  beneficiary_email: string;
  amount: number;
  status: WithdrawalStatus;
  payout_method: WithdrawalMethod;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
  scheduled_for: Date;
  reject_reason: string;
  requested_at: Date;
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

const withdrawalSchema = new Schema<IWalletWithdrawal>(
  {
    withdrawal_id: { type: String, required: true, unique: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    beneficiary_name: { type: String, default: '', trim: true, maxlength: 160 },
    beneficiary_email: { type: String, default: '', trim: true, lowercase: true },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['PENDING', 'PAID', 'REJECTED'], default: 'PENDING', index: true },
    payout_method: { type: String, enum: ['UPI', 'IMPS', 'NEFT'], default: 'UPI' },
    account_holder_name: { type: String, default: '', trim: true, maxlength: 120 },
    account_number: { type: String, default: '', trim: true, maxlength: 40 },
    ifsc_code: { type: String, default: '', trim: true, maxlength: 20 },
    upi_id: { type: String, default: '', trim: true, maxlength: 120 },
    scheduled_for: { type: Date, required: true },
    reject_reason: { type: String, default: '', trim: true, maxlength: 500 },
    requested_at: { type: Date, default: () => new Date() },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
    paid_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
withdrawalSchema.index({ status: 1, created_at: -1 });

export const WalletModel = model<IWallet>('Wallet', walletSchema);
export const WalletTransactionModel = model<IWalletTransaction>('WalletTransaction', txnSchema);
export const WalletWithdrawalModel = model<IWalletWithdrawal>('WalletWithdrawal', withdrawalSchema);
