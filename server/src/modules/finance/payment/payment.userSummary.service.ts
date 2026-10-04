/**
 * Admin › User › Payment & Refund Logs: what one account has paid Duncit, what
 * it got back, and where its Duncit Coin stand.
 *
 * Read-only. Money is summed over every CAPTURED payment — SUCCESS, plus
 * REFUNDED (it was paid before it was given back) — so a refund never makes a
 * payment vanish from "paid". Refunds use the same rule as User Refund Logs and
 * the cancellation console: a payment counts once it carries
 * `metadata.refunded_at`, for `metadata.refunded_amount` (the running total
 * across part releases) or the whole total when no figure was written.
 * Net business is paid minus refunded.
 */
import { Types } from 'mongoose';
import { PaymentModel } from './payment.model';
import { REFUNDED_MONEY_EXPR } from './payment.refund.service';
import { CoinBalanceModel, CoinTransactionModel } from '../coin/coin.model';

const round2 = (n: number) => Math.round(n * 100) / 100;

const CAPTURED = { $in: ['$status', ['SUCCESS', 'REFUNDED']] };
const IS_REFUNDED = { $ne: [{ $ifNull: ['$metadata.refunded_at', null] }, null] };
const when = (test: unknown, value: unknown) => ({ $sum: { $cond: [test, value, 0] } });

interface PaymentAgg {
  payment_count: number;
  failed_count: number;
  paid_total: number;
  refund_count: number;
  refunded_total: number;
  coins_redeemed: number;
  last_paid_at: Date | null;
}

async function paymentFigures(userId: Types.ObjectId) {
  const [row] = await PaymentModel.aggregate<PaymentAgg>([
    { $match: { user_id: userId } },
    {
      $group: {
        _id: null,
        payment_count: when(CAPTURED, 1),
        failed_count: when({ $eq: ['$status', 'FAILED'] }, 1),
        paid_total: when(CAPTURED, '$total'),
        refund_count: when(IS_REFUNDED, 1),
        refunded_total: when(IS_REFUNDED, REFUNDED_MONEY_EXPR),
        coins_redeemed: when(CAPTURED, '$coins_redeemed'),
        last_paid_at: { $max: '$paid_at' },
      },
    },
  ]);
  return row ?? null;
}

/** The coin wallet: balance on file, and what the ledger has credited and debited in all. */
async function coinFigures(userId: Types.ObjectId) {
  const [balance, ledger] = await Promise.all([
    CoinBalanceModel.findOne({ user_id: userId }).select('balance lifetime_earned').lean(),
    CoinTransactionModel.aggregate<{ _id: 'CREDIT' | 'DEBIT'; amount: number }>([
      { $match: { user_id: userId } },
      { $group: { _id: '$type', amount: { $sum: '$amount' } } },
    ]),
  ]);
  const sum = (type: 'CREDIT' | 'DEBIT') => ledger.find((r) => r._id === type)?.amount ?? 0;
  return {
    balance: balance?.balance ?? 0,
    lifetime_earned: balance?.lifetime_earned ?? 0,
    credited: sum('CREDIT'),
    debited: sum('DEBIT'),
  };
}

export const paymentUserSummaryService = {
  /** `withCoins` is false for a caller without the Duncit Coin read — the coin half is then null. */
  async summary(userId: string, withCoins: boolean) {
    const empty = {
      currency_symbol: null,
      payment_count: 0,
      failed_count: 0,
      paid_total: 0,
      refund_count: 0,
      refunded_total: 0,
      net_business: 0,
      coins_redeemed: 0,
      last_paid_at: null,
      coins: null,
    };
    if (!Types.ObjectId.isValid(userId)) return empty;
    const id = new Types.ObjectId(userId);
    const [figures, latest, coins] = await Promise.all([
      paymentFigures(id),
      PaymentModel.findOne({ user_id: id }).sort({ created_at: -1 }).select('currency_symbol').lean(),
      withCoins ? coinFigures(id) : Promise.resolve(null),
    ]);
    if (!figures) return { ...empty, currency_symbol: latest?.currency_symbol ?? null, coins };
    const paid = round2(figures.paid_total);
    const refunded = round2(figures.refunded_total);
    return {
      currency_symbol: latest?.currency_symbol ?? null,
      payment_count: figures.payment_count,
      failed_count: figures.failed_count,
      paid_total: paid,
      refund_count: figures.refund_count,
      refunded_total: refunded,
      net_business: round2(paid - refunded),
      coins_redeemed: figures.coins_redeemed,
      last_paid_at: figures.last_paid_at ? figures.last_paid_at.toISOString() : null,
      coins,
    };
  },
};
