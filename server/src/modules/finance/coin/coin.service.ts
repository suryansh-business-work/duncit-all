import { Types } from 'mongoose';
import {
  CoinBalanceModel,
  CoinTransactionModel,
  type ICoinBalance,
  type ICoinTransaction,
} from './coin.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { logs } from '@observability/log';

/** Mongo's duplicate-key error — the unique payment_id index rejecting a repeat. */
const DUPLICATE_KEY = 11000;

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

const balancePub = (doc: ICoinBalance | null, earnPct: number) => ({
  balance: doc?.balance ?? 0,
  lifetime_earned: doc?.lifetime_earned ?? 0,
  earn_pct: earnPct,
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
   */
  async creditForPayment(opts: {
    userId: string;
    paymentId: string;
    spendAmount: number;
    reason: string;
  }): Promise<void> {
    if (!Types.ObjectId.isValid(opts.userId) || !opts.paymentId) return;

    const earnPct = await settingsService.getCoinEarnPct();
    const value = coinsForSpend(opts.spendAmount, earnPct);
    // A 0% rate, or a spend too small to round up to one coin, earns nothing —
    // and must not leave an empty ledger row behind to explain.
    if (value <= 0) return;

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
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      await CoinTransactionModel.create({
        user_id: userId,
        type: 'CREDIT',
        amount: value,
        balance_after: balance!.balance,
        source: 'PAYMENT_EARN',
        reason: opts.reason,
        payment_id: opts.paymentId,
        earn_pct: earnPct,
        spend_amount: opts.spendAmount,
      });
    } catch (e) {
      if ((e as { code?: number })?.code === DUPLICATE_KEY) {
        // Already granted for this payment. Roll the balance back to undo the
        // increment this duplicate attempt just applied.
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
   * Pay a referrer for bringing somebody in.
   *
   * A flat number of coins rather than a share of a spend: the referrer did not
   * buy anything, and the person they brought may never buy anything either —
   * what is being rewarded is the introduction.
   *
   * Idempotent per REFERRAL, enforced by the unique index rather than a
   * read-then-write check, because two requests racing to apply the same code
   * would both pass that check and pay twice. The loser undoes its own
   * increment, exactly as the payment path does.
   */
  async creditForReferral(opts: {
    referrerId: string;
    referralId: string;
    coins: number;
    reason: string;
  }): Promise<void> {
    const value = Math.max(0, Math.floor(opts.coins));
    if (!Types.ObjectId.isValid(opts.referrerId) || !opts.referralId || value <= 0) return;

    const userId = new Types.ObjectId(opts.referrerId);
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
        source: 'REFERRAL_EARN',
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
   */
  async redeemForPayment(opts: {
    userId: string;
    paymentId: string;
    coins: number;
    reason: string;
  }): Promise<void> {
    const value = Math.floor(Number(opts.coins) || 0);
    if (!Types.ObjectId.isValid(opts.userId) || !opts.paymentId || value <= 0) return;

    const userId = new Types.ObjectId(opts.userId);
    // `balance: { $gte: value }` is the whole guard — a checkout that raced
    // another one to the same coins simply does not match, and the discount it
    // already granted is the (bounded, logged) cost of losing that race.
    const balance = await CoinBalanceModel.findOneAndUpdate(
      { user_id: userId, balance: { $gte: value } },
      { $inc: { balance: -value } },
      { new: true }
    );
    if (!balance) {
      logs.server.warn('coin', 'redeemForPayment', {
        msg: 'Coin redemption skipped — balance moved after checkout was priced',
      });
      return;
    }
    try {
      await CoinTransactionModel.create({
        user_id: userId,
        type: 'DEBIT',
        amount: value,
        balance_after: balance.balance,
        source: 'PAYMENT_REDEEM',
        reason: opts.reason,
        payment_id: opts.paymentId,
        earn_pct: 0,
        spend_amount: 0,
      });
    } catch (e) {
      if ((e as { code?: number })?.code === DUPLICATE_KEY) {
        // Already redeemed for this payment — put back what this retry took.
        await CoinBalanceModel.updateOne({ user_id: userId }, { $inc: { balance: value } });
        return;
      }
      throw e;
    }
  },

  async getMyBalance(userId: string) {
    const earnPct = await settingsService.getCoinEarnPct();
    if (!Types.ObjectId.isValid(userId)) return balancePub(null, earnPct);
    const doc = await CoinBalanceModel.findOne({ user_id: new Types.ObjectId(userId) });
    return balancePub(doc, earnPct);
  },

  async listMyTransactions(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return [];
    const rows = await CoinTransactionModel.find({ user_id: new Types.ObjectId(userId) })
      .sort({ created_at: -1 })
      .limit(200);
    return rows.map(txnPub);
  },
};
