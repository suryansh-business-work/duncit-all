import { GraphQLError } from 'graphql';
import { Types, type ClientSession } from 'mongoose';
import {
  CoinBalanceModel,
  CoinTransactionModel,
  type CoinTxnSource,
  type ICoinBalance,
  type ICoinTransaction,
} from './coin.model';
import { coinSettingsService } from './coin.settings.service';
import { UserModel } from '@modules/access/user/user.model';
import type { PaymentTargetType } from '@modules/finance/payment/payment.model';
import { logs } from '@observability/log';

/** Mongo's duplicate-key error — the unique payment_id index rejecting a repeat. */
const DUPLICATE_KEY = 11000;

const badInput = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

/**
 * Coins earned on a spend. 1 coin = 1 rupee, so a fractional coin would be a
 * fractional rupee of value: the grant floors to a whole coin. The exact rate
 * and order total are stored on the row, so the arithmetic stays auditable.
 */
export function coinsForSpend(spendAmount: number, earnPct: number): number {
  const spend = Number(spendAmount) || 0;
  const pct = Number(earnPct) || 0;
  if (spend <= 0 || pct <= 0) return 0;
  return Math.floor((spend * pct) / 100);
}

/**
 * Coins handed back when a booking is backed out.
 *
 * The coin half of the cash refund, and it is deliberately the SAME shape:
 * prorated by the seats actually released over the seats the payment covered,
 * then less the Backouts deduction from Finance > Default Deductions — the one
 * percentage that governs what a backout costs, whether it is paid in money or
 * in coins.
 *
 * Floors to a whole coin: 1 coin = 1 rupee of value, so half a coin is half a
 * rupee nobody can spend, and rounding UP would pay back more than was taken.
 */
export function coinsForBackoutRefund(opts: {
  coinsPaid: number;
  releaseSeats: number;
  paidSeats: number;
  deductionPct: number;
}): number {
  const paid = Math.floor(Number(opts.coinsPaid) || 0);
  const release = Math.max(0, Number(opts.releaseSeats) || 0);
  const covered = Math.max(1, Number(opts.paidSeats) || 1);
  if (paid <= 0 || release <= 0) return 0;
  const pct = Math.max(0, Math.min(100, Number(opts.deductionPct) || 0));
  const share = (paid * Math.min(release, covered)) / covered;
  return Math.floor(share - (share * pct) / 100);
}

const balancePub = (
  doc: ICoinBalance | null,
  rates: { pod: number; shop: number }
) => ({
  balance: doc?.balance ?? 0,
  lifetime_earned: doc?.lifetime_earned ?? 0,
  earn_pct: rates.pod,
  shop_earn_pct: rates.shop,
});

const txnPub = (t: ICoinTransaction) => ({
  id: t._id.toString(),
  type: t.type,
  amount: t.amount,
  balance_after: t.balance_after,
  source: t.source,
  reason: t.reason ?? '',
  payment_id: t.payment_id ?? null,
  earn_pct: t.earn_pct ?? 0,
  spend_amount: t.spend_amount ?? 0,
  created_at: t.created_at?.toISOString?.() ?? '',
});

export const coinService = {
  /**
   * Grant a buyer their coins for one successful payment. Idempotent per
   * payment: a retried checkout hits the unique index and the duplicate is
   * dropped rather than paying the reward twice.
   *
   * `targetType` picks the rate — a pod ticket and a shop order earn at their
   * own configured percentages.
   *
   * @returns the coins actually granted (0 when the rate earns nothing or the
   * payment had already been rewarded) — the payment mirrors it on `coins_earned`.
   */
  async creditForPayment(opts: {
    userId: string;
    paymentId: string;
    spendAmount: number;
    reason: string;
    targetType?: PaymentTargetType | null;
    session?: ClientSession;
  }): Promise<number> {
    if (!Types.ObjectId.isValid(opts.userId) || !opts.paymentId) return 0;

    const earnPct = await coinSettingsService.earnPctFor(opts.targetType);
    const value = coinsForSpend(opts.spendAmount, earnPct);
    // A 0% rate, or a spend too small to round up to one coin, earns nothing —
    // and must not leave an empty ledger row behind to explain.
    if (value <= 0) return 0;

    const session = opts.session;
    const userId = new Types.ObjectId(opts.userId);
    // The balance moves first so the ledger row can record the resulting
    // balance_after in one write; the row's unique payment_id is what actually
    // enforces once-only, and a loser of that race undoes its own increment
    // below. Ordering it the other way would need a second write to backfill
    // balance_after, and a crash between the two would shortchange the buyer.
    try {
      const balance = await CoinBalanceModel.findOneAndUpdate(
        { user_id: userId },
        { $inc: { balance: value, lifetime_earned: value } },
        { upsert: true, new: true, setDefaultsOnInsert: true, session }
      );
      await CoinTransactionModel.create(
        [
          {
            user_id: userId,
            type: 'CREDIT',
            amount: value,
            balance_after: balance!.balance,
            source: 'PAYMENT_EARN',
            reason: opts.reason,
            payment_id: opts.paymentId,
            earn_pct: earnPct,
            spend_amount: opts.spendAmount,
          },
        ],
        { session }
      );
      return value;
    } catch (e) {
      if ((e as { code?: number })?.code === DUPLICATE_KEY) {
        // Already granted for this payment. Roll the balance back to undo the
        // increment this duplicate attempt just applied.
        await CoinBalanceModel.updateOne(
          { user_id: userId },
          { $inc: { balance: -value, lifetime_earned: -value } },
          { session }
        );
        return 0;
      }
      throw e;
    }
  },

  /**
   * Pay one side of a referral.
   *
   * A flat number of coins rather than a share of a spend: nobody bought
   * anything, and the person who was brought in may never buy anything either —
   * what is being rewarded is the introduction. Both ends of it: the referrer
   * earns for making it (REFERRAL_EARN) and the new member earns for arriving
   * through it (REFERRAL_SIGNUP), which is why the source is a parameter.
   *
   * Idempotent per REFERRAL AND SOURCE, enforced by the unique index rather
   * than a read-then-write check, because two requests racing to apply the same
   * code would both pass that check and pay twice. The loser undoes its own
   * increment, exactly as the payment path does.
   */
  async creditForReferral(opts: {
    userId: string;
    referralId: string;
    coins: number;
    reason: string;
    source: Extract<CoinTxnSource, 'REFERRAL_EARN' | 'REFERRAL_SIGNUP'>;
  }): Promise<void> {
    const value = Math.max(0, Math.floor(opts.coins));
    if (!Types.ObjectId.isValid(opts.userId) || !opts.referralId || value <= 0) return;

    const userId = new Types.ObjectId(opts.userId);
    try {
      const balance = await CoinBalanceModel.findOneAndUpdate(
        { user_id: userId },
        { $inc: { balance: value, lifetime_earned: value } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      await CoinTransactionModel.create({
        user_id: userId,
        type: 'CREDIT',
        amount: value,
        balance_after: balance!.balance,
        source: opts.source,
        reason: opts.reason,
        referral_id: opts.referralId,
      });
    } catch (e) {
      if ((e as { code?: number })?.code === DUPLICATE_KEY) {
        await CoinBalanceModel.updateOne(
          { user_id: userId },
          { $inc: { balance: -value, lifetime_earned: -value } }
        );
        return;
      }
      throw e;
    }
  },

  /**
   * Convert a gift card's value into coins — the redemption of a purchased
   * card. A flat amount, like a referral: nothing was spent, so no rate
   * applies; the card's face value simply moves into the balance.
   *
   * Idempotent per GIFT CARD, enforced by the unique (gift_card_id, source)
   * index rather than a read-then-write check, because two holders of a shared
   * code racing the redeem button would both pass that check and mint the value
   * twice. The loser undoes its own increment, exactly as the payment path does.
   *
   * @returns the coins actually credited (0 when this card already paid out).
   */
  async creditForGiftCard(opts: {
    userId: string;
    giftCardId: string;
    coins: number;
    reason: string;
  }): Promise<number> {
    const value = Math.max(0, Math.floor(opts.coins));
    if (!Types.ObjectId.isValid(opts.userId) || !opts.giftCardId || value <= 0) return 0;

    const userId = new Types.ObjectId(opts.userId);
    try {
      const balance = await CoinBalanceModel.findOneAndUpdate(
        { user_id: userId },
        { $inc: { balance: value, lifetime_earned: value } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      await CoinTransactionModel.create({
        user_id: userId,
        type: 'CREDIT',
        amount: value,
        balance_after: balance!.balance,
        source: 'GIFT_CARD_REDEEM',
        reason: opts.reason,
        gift_card_id: opts.giftCardId,
      });
      return value;
    } catch (e) {
      if ((e as { code?: number })?.code === DUPLICATE_KEY) {
        await CoinBalanceModel.updateOne(
          { user_id: userId },
          { $inc: { balance: -value, lifetime_earned: -value } }
        );
        return 0;
      }
      throw e;
    }
  },

  /**
   * Drop index definitions the schema no longer declares and build the ones it
   * does. The referral guard moved from `{referral_id}` to
   * `{referral_id, source}`, and mongoose's autoIndex only ADDS — left alone,
   * the old unique index survives and rejects the second of a referral's two
   * credits.
   */
  async syncIndexes(): Promise<void> {
    await CoinTransactionModel.syncIndexes();
  },

  /** Spendable coin count — what a checkout may price a redemption against. */
  async balanceOf(userId: string): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) return 0;
    const doc = await CoinBalanceModel.findOne({ user_id: new Types.ObjectId(userId) });
    return doc?.balance ?? 0;
  },

  /**
   * Spend coins the buyer applied to a payment. Idempotent per payment, and the
   * debit is a single guarded update: the balance can never go negative and two
   * concurrent checkouts can never both spend the same coins.
   *
   * @returns whether the coins are now spent for this payment. FALSE means the
   * balance moved after the checkout was priced and nothing was debited — the
   * caller granted a discount against coins it does not have, so it must undo
   * the sale rather than record the redemption as done.
   */
  async redeemForPayment(opts: {
    userId: string;
    paymentId: string;
    coins: number;
    reason: string;
    session?: ClientSession;
  }): Promise<boolean> {
    const value = Math.floor(Number(opts.coins) || 0);
    if (!Types.ObjectId.isValid(opts.userId) || !opts.paymentId || value <= 0) return false;

    const session = opts.session;
    const userId = new Types.ObjectId(opts.userId);
    // `balance: { $gte: value }` is the whole guard — a checkout that raced
    // another one to the same coins simply does not match, and the caller is
    // told so it can roll the discount back with the rest of the sale.
    const balance = await CoinBalanceModel.findOneAndUpdate(
      { user_id: userId, balance: { $gte: value } },
      { $inc: { balance: -value } },
      { new: true, session }
    );
    if (!balance) {
      logs.server.warn('coin', 'redeemForPayment', {
        msg: 'Coin redemption failed — balance moved after checkout was priced',
      });
      return false;
    }
    try {
      await CoinTransactionModel.create(
        [
          {
            user_id: userId,
            type: 'DEBIT',
            amount: value,
            balance_after: balance.balance,
            source: 'PAYMENT_REDEEM',
            reason: opts.reason,
            payment_id: opts.paymentId,
            earn_pct: 0,
            spend_amount: 0,
          },
        ],
        { session }
      );
    } catch (e) {
      if ((e as { code?: number })?.code === DUPLICATE_KEY) {
        // Already redeemed for this payment — put back what this retry took.
        // The coins ARE spent for this payment, so this is a success.
        await CoinBalanceModel.updateOne(
          { user_id: userId },
          { $inc: { balance: value } },
          { session }
        );
        return true;
      }
      throw e;
    }
    return true;
  },

  /**
   * Gives back the coins a backed-out booking was paid with.
   *
   * The coin half of the cash refund, and it follows the cash exactly: the
   * caller has already taken its share of the seats released and the Backouts
   * deduction off the top (`coinsRefundedForBackout`), so this only moves what
   * it is handed. Balance only — `lifetime_earned` is untouched, because
   * returning coins somebody already had is not earning them again.
   *
   * Idempotent on the BACKOUT, not the payment: a partial release leaves the
   * booking alive and refundable, so one payment can reach here more than once
   * and each release must pay back its own seats. A retry of the SAME release
   * collides on the unique index and is swallowed as the success it is.
   *
   * @returns the coins actually credited (0 when there is nothing to give back
   * or this backout was already refunded).
   */
  async refundForBackout(opts: {
    userId: string;
    backoutId: string;
    paymentId: string | null;
    coins: number;
    reason: string;
    session?: ClientSession;
  }): Promise<number> {
    const value = Math.floor(Number(opts.coins) || 0);
    if (!Types.ObjectId.isValid(opts.userId) || !opts.backoutId || value <= 0) return 0;

    const session = opts.session;
    const userId = new Types.ObjectId(opts.userId);
    const balance = await CoinBalanceModel.findOneAndUpdate(
      { user_id: userId },
      { $inc: { balance: value } },
      { new: true, upsert: true, session }
    );
    try {
      await CoinTransactionModel.create(
        [
          {
            user_id: userId,
            type: 'CREDIT',
            amount: value,
            balance_after: balance.balance,
            source: 'PAYMENT_REFUND',
            reason: opts.reason,
            payment_id: opts.paymentId,
            backout_id: opts.backoutId,
            earn_pct: 0,
            spend_amount: 0,
          },
        ],
        { session }
      );
    } catch (e) {
      if ((e as { code?: number })?.code === DUPLICATE_KEY) {
        // This backout was already refunded — take back what the retry added.
        await CoinBalanceModel.updateOne(
          { user_id: userId },
          { $inc: { balance: -value } },
          { session }
        );
        return 0;
      }
      throw e;
    }
    return value;
  },

  /**
   * A coin adjustment an admin typed, for one named person — the goodwill
   * credit, the correction, the compensation no automatic rule covers.
   *
   * Deliberately NOT idempotent: unlike a payment or a referral there is no
   * external event to key on, and two identical grants are two real decisions.
   * The guard that matters is on the other side — a deduct can never take a
   * balance below zero, and asking for more than the account holds is refused
   * with the real number rather than quietly deducting a different amount than
   * the one that was typed.
   */
  async adminAdjust(opts: {
    userId: string;
    adminId: string;
    direction: 'GRANT' | 'DEDUCT';
    coins: number;
    reason: string;
  }) {
    const value = Math.floor(Number(opts.coins) || 0);
    if (value <= 0) badInput('Enter how many coins to apply');
    const reason = (opts.reason ?? '').trim();
    if (!reason) badInput('A reason is required — it is what the ledger row explains');
    if (!Types.ObjectId.isValid(opts.userId)) badInput('Choose a user');

    const userId = new Types.ObjectId(opts.userId);
    if (!(await UserModel.exists({ _id: userId }))) badInput('That account no longer exists');

    const grant = opts.direction === 'GRANT';
    // The deduct is a single guarded update for the same reason the redemption
    // is: read-then-write lets two admins both pass the check and overdraw.
    const balance = grant
      ? await CoinBalanceModel.findOneAndUpdate(
          { user_id: userId },
          { $inc: { balance: value, lifetime_earned: value } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      : await CoinBalanceModel.findOneAndUpdate(
          { user_id: userId, balance: { $gte: value } },
          { $inc: { balance: -value } },
          { new: true }
        );

    if (!balance) {
      const held = await this.balanceOf(opts.userId);
      badInput(`That account holds ${held} coins — it cannot give up ${value}`);
    }

    await CoinTransactionModel.create({
      user_id: userId,
      type: grant ? 'CREDIT' : 'DEBIT',
      amount: value,
      balance_after: balance!.balance,
      source: grant ? 'ADMIN_GRANT' : 'ADMIN_DEDUCT',
      reason,
      admin_id: new Types.ObjectId(opts.adminId),
    });

    return {
      balance: balance!.balance,
      lifetime_earned: balance!.lifetime_earned,
      // Echoing what landed lets the console confirm the exact movement rather
      // than re-deriving it from a number that may already have moved again.
      applied: grant ? value : -value,
    };
  },

  async getMyBalance(userId: string) {
    const settings = await coinSettingsService.get();
    const rates = { pod: settings.pod_join_earn_pct, shop: settings.shop_earn_pct };
    if (!Types.ObjectId.isValid(userId)) return balancePub(null, rates);
    const doc = await CoinBalanceModel.findOne({ user_id: new Types.ObjectId(userId) });
    return balancePub(doc, rates);
  },

  async listMyTransactions(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return [];
    const rows = await CoinTransactionModel.find({ user_id: new Types.ObjectId(userId) })
      .sort({ created_at: -1 })
      .limit(200);
    return rows.map(txnPub);
  },
};
