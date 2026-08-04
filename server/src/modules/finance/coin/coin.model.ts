import { Schema, model, Types, type Document } from 'mongoose';

export type CoinTxnType = 'CREDIT' | 'DEBIT';
export type CoinTxnSource = 'PAYMENT_EARN' | 'PAYMENT_REDEEM';

/**
 * Duncit Coins are a loyalty balance, NOT withdrawable money — which is exactly
 * why they live in their own collections instead of riding the Wallet. A wallet
 * balance is paid out to a bank account (`walletService.requestWithdrawal`), so
 * a coin source added to `WalletTxnSource` would turn every reward into cash.
 */
export interface ICoinBalance extends Document {
  user_id: Types.ObjectId;
  balance: number;
  lifetime_earned: number;
  created_at: Date;
  updated_at: Date;
}

export interface ICoinTransaction extends Document {
  /** Narrowed from Document's `unknown` so serialising the id is type-safe. */
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  type: CoinTxnType;
  amount: number;
  balance_after: number;
  source: CoinTxnSource;
  reason: string;
  /** Business key of the payment that earned this row — the idempotency key. */
  payment_id: string | null;
  /** Rate in effect when the coins were granted, so changing the setting later
   * never rewrites what a past row says the user was promised. */
  earn_pct: number;
  /** Order total the grant was computed from, so a row is auditable on its own. */
  spend_amount: number;
  created_at: Date;
}

const coinBalanceSchema = new Schema<ICoinBalance>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    balance: { type: Number, default: 0, min: 0 },
    lifetime_earned: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const coinTxnSchema = new Schema<ICoinTransaction>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    amount: { type: Number, required: true, min: 0 },
    balance_after: { type: Number, required: true, min: 0 },
    source: { type: String, enum: ['PAYMENT_EARN', 'PAYMENT_REDEEM'], required: true },
    reason: { type: String, default: '', trim: true, maxlength: 300 },
    payment_id: { type: String, default: null },
    earn_pct: { type: Number, default: 0 },
    spend_amount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
coinTxnSchema.index({ user_id: 1, created_at: -1 });

// A retried checkout must neither pay the reward twice nor spend the coins
// twice. The sibling wallet ledger guards its payout with a read-then-write
// `exists()` check (wallet.service.ts), which two concurrent calls both pass —
// so this one is enforced by the database instead: a duplicate insert raises
// E11000 and the service swallows it. Keyed on source as well as payment, since
// one payment legitimately writes both a REDEEM and an EARN row. Partial,
// because rows without a payment_id are exempt.
coinTxnSchema.index(
  { payment_id: 1, source: 1 },
  { unique: true, partialFilterExpression: { payment_id: { $type: 'string' } } }
);

export const CoinBalanceModel = model<ICoinBalance>('CoinBalance', coinBalanceSchema);
export const CoinTransactionModel = model<ICoinTransaction>('CoinTransaction', coinTxnSchema);
