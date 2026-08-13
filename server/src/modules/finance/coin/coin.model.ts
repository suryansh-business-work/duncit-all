import { Schema, model, Types, type Document } from 'mongoose';

export type CoinTxnType = 'CREDIT' | 'DEBIT';
/**
 * REFERRAL_EARN pays the referrer, REFERRAL_SIGNUP pays the person they brought.
 * ADMIN_GRANT / ADMIN_DEDUCT are the manual, user-specific adjustments made from
 * Finance > Duncit Coin > Settings — the only rows a human types the amount for,
 * which is why they are the only ones that record who did it.
 */
export type CoinTxnSource =
  | 'PAYMENT_EARN'
  | 'PAYMENT_REDEEM'
  | 'REFERRAL_EARN'
  | 'REFERRAL_SIGNUP'
  | 'GIFT_CARD_REDEEM'
  | 'ADMIN_GRANT'
  | 'ADMIN_DEDUCT';

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
  /** The referral that earned this row. The same job as payment_id, for the
   * other way coins are earned — one referral pays its referrer once. */
  referral_id: string | null;
  /** The gift card whose value became these coins. The same job as payment_id,
   * for the third way coins arrive — one card converts exactly once. */
  gift_card_id: string | null;
  /** The admin who typed this adjustment, on ADMIN_GRANT / ADMIN_DEDUCT rows
   * only. A manual grant has no payment and no referral to explain it, so
   * without this the ledger cannot answer who created the coins. */
  admin_id: Types.ObjectId | null;
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
    source: {
      type: String,
      enum: [
        'PAYMENT_EARN',
        'PAYMENT_REDEEM',
        'REFERRAL_EARN',
        'REFERRAL_SIGNUP',
        'GIFT_CARD_REDEEM',
        'ADMIN_GRANT',
        'ADMIN_DEDUCT',
      ],
      required: true,
    },
    reason: { type: String, default: '', trim: true, maxlength: 300 },
    payment_id: { type: String, default: null },
    referral_id: { type: String, default: null },
    gift_card_id: { type: String, default: null },
    admin_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    earn_pct: { type: Number, default: 0 },
    spend_amount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
coinTxnSchema.index({ user_id: 1, created_at: -1 });

// The admin ledger table and the month-distribution aggregate both read the
// whole collection ordered by time. The compound index above is prefixed on
// user_id, so it cannot serve a query that has no user to pin.
coinTxnSchema.index({ created_at: -1 });

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

// The same guard for the other way coins are earned. Two requests racing to
// apply the same code both reach the insert — so the database decides, not a
// read-then-write check.
//
// Keyed on source as well as referral, exactly like the payment index above,
// because ONE referral now pays TWO people: the referrer (REFERRAL_EARN) and
// the person who signed up with their code (REFERRAL_SIGNUP). Keyed on the
// referral alone — as it was while only the referrer earned — the second
// credit collided with the first and the new member silently got nothing.
//
// Replacing a unique index needs the old one DROPPED, which mongoose only does
// through syncIndexes(); it runs at boot (`coinIndexes` in index.ts).
coinTxnSchema.index(
  { referral_id: 1, source: 1 },
  { unique: true, partialFilterExpression: { referral_id: { $type: 'string' } } }
);

// The same guard for the third way coins arrive: a gift card converting into
// coins. One card pays out exactly once, however many times the redeem
// mutation is retried or two holders of a shared code race — the database
// decides, not a read-then-write check. New index: lands via the same
// syncIndexes() boot seed (`coinIndexes` in index.ts).
coinTxnSchema.index(
  { gift_card_id: 1, source: 1 },
  { unique: true, partialFilterExpression: { gift_card_id: { $type: 'string' } } }
);

/**
 * Every rule that decides how many coins a person is given, in one document.
 *
 * The rates used to be scattered — the earn rate sat on AppSettings (Admin > Pod
 * Settings) and the referral amount on ReferralSettings — which meant no single
 * screen could answer "what does Duncit pay out, and when". They live together
 * here because they are one policy, edited by one team, on one page.
 */
export interface ICoinSettings extends Document {
  singleton_key: string;
  /** Percent of a pod-ticket payment granted back to the buyer as coins. */
  pod_join_earn_pct: number;
  /** The same, for shop/product orders. Split from the pod rate because a
   * physical product carries a cost of goods a pod seat does not. */
  shop_earn_pct: number;
  /** Flat coins paid to BOTH sides of a referral — the referrer and the member
   * they brought. One rate, deliberately: two would let the promise drift. */
  coins_per_referral: number;
  created_at: Date;
  updated_at: Date;
}

const coinSettingsSchema = new Schema<ICoinSettings>(
  {
    singleton_key: { type: String, default: 'coin', unique: true },
    pod_join_earn_pct: { type: Number, default: 10, min: 0, max: 100 },
    shop_earn_pct: { type: Number, default: 10, min: 0, max: 100 },
    coins_per_referral: { type: Number, default: 50, min: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const CoinBalanceModel = model<ICoinBalance>('CoinBalance', coinBalanceSchema);
export const CoinTransactionModel = model<ICoinTransaction>('CoinTransaction', coinTxnSchema);
export const CoinSettingsModel = model<ICoinSettings>('CoinSettings', coinSettingsSchema);
