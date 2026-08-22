import { Schema, model, Types, type Document } from 'mongoose';

/**
 * The card's THEME — what it was bought "for". The three category tiers share
 * one Category collection discriminated by `level` (SUPER/CATEGORY/SUB), so a
 * single `scope_category_id` serves all of them; SHOP is the global Pod Shop,
 * which has no document of its own, so a SHOP card carries no category.
 *
 * The scope decides the card's design and title, NOT where it can be spent:
 * redeeming a card converts its whole value into Duncit Coins, and coins spend
 * anywhere coins already spend.
 */
export type GiftCardScopeType = 'SHOP' | 'SUPER' | 'CATEGORY' | 'SUB';

/** Stored status. EXPIRED is derived from `expires_at` at read time — the
 * redemption guard enforces it, so a clock is never trusted twice. */
export type GiftCardStatus = 'ACTIVE' | 'REDEEMED';

export type GiftCardTxnType = 'ISSUE' | 'REDEEM';
export type GiftCardTxnSource = 'PURCHASE' | 'REDEEM_TO_COINS';

/**
 * A purchased gift card — a bearer instrument: whoever holds the code holds the
 * value, which is exactly what "share it by email or link" promises. Redemption
 * is all-or-nothing: the full balance converts to Duncit Coins in one act, and
 * the first redeemer becomes `redeemed_by_user_id`.
 *
 * The card is created ONLY on payment success (from facts frozen on the
 * payment's metadata), never at checkout creation — abandoned checkout sheets
 * must not leave half-born cards behind. `payment_id` is unique so the six
 * payment-success paths can all replay the issue leg and exactly one card ever
 * exists per purchase.
 */
export interface IGiftCard extends Document {
  _id: Types.ObjectId;
  /** Human redemption code (XXXX-XXXX-XXXX-XXXX) — the bearer secret. */
  code: string;
  purchaser_user_id: Types.ObjectId;
  /** Empty for a self-purchase — the buyer is the recipient. */
  recipient_email: string;
  recipient_name: string;
  /** Personal note printed on the card and in the email. */
  message: string;
  scope_type: GiftCardScopeType;
  scope_category_id: Types.ObjectId | null;
  /** Snapshots — categories hard-cascade-delete without consulting referrers,
   * so a live-only lookup would dangle. SHOP cards store '' and clients t() it. */
  scope_name: string;
  scope_image_url: string;
  /** The category's uploaded card artwork, frozen at purchase. Empty means the
   * category had none, and every surface renders the gradient card instead. */
  scope_image_front_url: string;
  scope_image_back_url: string;
  initial_amount: number;
  /** Equals initial_amount until redeemed, then 0 — kept so the ledger's
   * balance_after chain audits on its own. */
  balance: number;
  status: GiftCardStatus;
  /** Who converted it to coins. Null until redeemed. */
  redeemed_by_user_id: Types.ObjectId | null;
  redeemed_at: Date | null;
  /** Business key of the purchase payment — the issue idempotency key. */
  payment_id: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IGiftCardTransaction extends Document {
  _id: Types.ObjectId;
  gift_card_id: Types.ObjectId;
  /** Snapshot of the card's code, so a ledger row reads on its own. */
  code: string;
  /** The actor: the purchaser on ISSUE, the redeemer on REDEEM. */
  user_id: Types.ObjectId;
  type: GiftCardTxnType;
  amount: number;
  balance_after: number;
  source: GiftCardTxnSource;
  /** The purchase payment on ISSUE rows; null on REDEEM rows (nothing was
   * bought — the value moved into the coin ledger). */
  payment_id: string | null;
  created_at: Date;
}

/** Platform policy for selling gift cards, one document (Finance owns it). */
export interface IGiftCardSettings extends Document {
  singleton_key: string;
  /** Preset amount chips the buy page offers. */
  denominations: number[];
  /** Bounds for a custom amount (whole rupees). */
  min_amount: number;
  max_amount: number;
  /** Months from purchase until the card expires. */
  validity_months: number;
  created_at: Date;
  updated_at: Date;
}

const giftCardSchema = new Schema<IGiftCard>(
  {
    code: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
    purchaser_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient_email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
    recipient_name: { type: String, default: '', trim: true, maxlength: 160 },
    message: { type: String, default: '', trim: true, maxlength: 300 },
    scope_type: {
      type: String,
      enum: ['SHOP', 'SUPER', 'CATEGORY', 'SUB'],
      required: true,
      index: true,
    },
    scope_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    scope_name: { type: String, default: '', trim: true },
    scope_image_url: { type: String, default: '', trim: true },
    scope_image_front_url: { type: String, default: '', trim: true },
    scope_image_back_url: { type: String, default: '', trim: true },
    initial_amount: { type: Number, required: true, min: 1 },
    balance: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['ACTIVE', 'REDEEMED'], default: 'ACTIVE' },
    redeemed_by_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    redeemed_at: { type: Date, default: null },
    payment_id: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
giftCardSchema.index({ created_at: -1 });

const giftCardTxnSchema = new Schema<IGiftCardTransaction>(
  {
    gift_card_id: { type: Schema.Types.ObjectId, ref: 'GiftCard', required: true, index: true },
    code: { type: String, required: true, trim: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['ISSUE', 'REDEEM'], required: true },
    amount: { type: Number, required: true, min: 0 },
    balance_after: { type: Number, required: true, min: 0 },
    source: { type: String, enum: ['PURCHASE', 'REDEEM_TO_COINS'], required: true },
    payment_id: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
giftCardTxnSchema.index({ created_at: -1 });

// A replayed payment-success must not issue a second card's worth of ledger:
// one payment writes at most one PURCHASE row. Enforced by the database, like
// the coin ledger — keyed on the business payment_id string ('pay_...').
giftCardTxnSchema.index(
  { payment_id: 1, source: 1 },
  { unique: true, partialFilterExpression: { payment_id: { $type: 'string' } } }
);

// One card converts to coins exactly once, however many times the redeem
// mutation is retried or raced — the database decides, not a read-then-write
// check. Partial: ISSUE rows are exempt.
giftCardTxnSchema.index(
  { gift_card_id: 1, source: 1 },
  { unique: true, partialFilterExpression: { source: 'REDEEM_TO_COINS' } }
);

const giftCardSettingsSchema = new Schema<IGiftCardSettings>(
  {
    singleton_key: { type: String, default: 'giftcard', unique: true },
    denominations: { type: [Number], default: [500, 1000, 2000, 5000] },
    min_amount: { type: Number, default: 100, min: 1 },
    max_amount: { type: Number, default: 10000, min: 1 },
    validity_months: { type: Number, default: 12, min: 1, max: 60 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const GiftCardModel = model<IGiftCard>('GiftCard', giftCardSchema);
export const GiftCardTransactionModel = model<IGiftCardTransaction>(
  'GiftCardTransaction',
  giftCardTxnSchema
);
export const GiftCardSettingsModel = model<IGiftCardSettings>(
  'GiftCardSettings',
  giftCardSettingsSchema
);
