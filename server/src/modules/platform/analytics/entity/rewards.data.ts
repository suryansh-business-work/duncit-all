import type { Types } from 'mongoose';
import { CoinBalanceModel, CoinTransactionModel } from '@modules/finance/coin/coin.model';
import { GiftCardModel, GiftCardTransactionModel } from '@modules/finance/giftcard/giftcard.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { ReferralCodeModel, ReferralModel } from '@modules/engagement/referral/referral.model';
import { dayKeyExpr, inRange } from './window';
import { CAPTURED } from './revenue.data';
import type { Keyed } from './aggregates';
import type { Band } from './shapes';

/**
 * Everything Analytics > Money > Coins, Referrals & Gift Cards reads. Coins
 * are counted in coins (one coin takes one rupee off a bill); gift cards and
 * checkout discounts in rupees, as stored.
 */

export interface ReferralRow {
  referrer_user_id: Types.ObjectId;
  referred_user_id: Types.ObjectId;
  created_at: Date;
}

export interface RewardsPeriod {
  /** Coins moved per ledger source, credits and debits kept apart. */
  credits: Map<string, number>;
  debits: Map<string, number>;
  /** Rupees taken off paid checkouts by coins. */
  checkout_coins: number;
  referrals: ReferralRow[];
  /** Ids of referred members who have paid for something since joining. */
  converted: Set<string>;
  cards_sold: number;
  value_sold: number;
  value_redeemed: number;
}

/** Referred members who have made at least one paid checkout — a code only counts once it brings a customer. */
async function convertedMembers(referrals: readonly ReferralRow[]): Promise<Set<string>> {
  if (referrals.length === 0) return new Set();
  const payers = await PaymentModel.distinct('user_id', {
    user_id: { $in: referrals.map((row) => row.referred_user_id) },
    status: { $in: CAPTURED },
  });
  return new Set(payers.map(String));
}

const sumBy = (rows: ReadonlyArray<{ _id: string; value: number }>) =>
  new Map(rows.map((row) => [row._id, row.value]));

/** Each tile's raw totals for one period — loaded identically for the period before. */
export async function loadRewardsPeriod(from: Date, to: Date): Promise<RewardsPeriod> {
  const range = inRange(from, to);
  const [ledger, checkout, referrals, cards] = await Promise.all([
    CoinTransactionModel.aggregate<{ _id: { type: string; source: string }; value: number }>([
      { $match: { created_at: range } },
      { $group: { _id: { type: '$type', source: '$source' }, value: { $sum: '$amount' } } },
    ]),
    PaymentModel.aggregate<{ coins: number }>([
      { $match: { status: { $in: CAPTURED }, created_at: range, coins_redeemed: { $gt: 0 } } },
      { $group: { _id: null, coins: { $sum: '$coins_redeemed' } } },
    ]),
    ReferralModel.find({ created_at: range })
      .select('referrer_user_id referred_user_id created_at')
      .lean<ReferralRow[]>(),
    GiftCardTransactionModel.aggregate<{ _id: string; value: number; count: number }>([
      { $match: { created_at: range } },
      { $group: { _id: '$type', value: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);
  const ofType = (type: string) =>
    sumBy(ledger.filter((row) => row._id.type === type).map((row) => ({ _id: row._id.source, value: row.value })));
  const issued = cards.find((row) => row._id === 'ISSUE');
  return {
    credits: ofType('CREDIT'),
    debits: ofType('DEBIT'),
    checkout_coins: Math.round(checkout[0]?.coins ?? 0),
    referrals,
    converted: await convertedMembers(referrals),
    cards_sold: issued?.count ?? 0,
    value_sold: Math.round(issued?.value ?? 0),
    value_redeemed: Math.round(cards.find((row) => row._id === 'REDEEM')?.value ?? 0),
  };
}

/** How many coins members are holding right now, banded. `min` doubles as the `$bucket` boundary. */
export const BALANCE_BANDS: Band[] = [
  { key: 'balance_under_50', min: 0 },
  { key: 'balance_50_199', min: 50 },
  { key: 'balance_200_499', min: 200 },
  { key: 'balance_500_plus', min: 500 },
];

/** The coin and gift card position right now, whatever the period. */
export async function loadRewardsLive(now: Date) {
  const lastBand = BALANCE_BANDS.at(-1)?.min ?? 0;
  const [ledger, holders, cards] = await Promise.all([
    // Outstanding is read from the insert-only ledger, as Finance > Duncit Coin does, so it can never drift from it.
    CoinTransactionModel.aggregate<{ _id: string; value: number }>([
      { $group: { _id: '$type', value: { $sum: '$amount' } } },
    ]),
    CoinBalanceModel.aggregate<{ _id: number; count: number }>([
      { $match: { balance: { $gt: 0 } } },
      {
        $bucket: {
          groupBy: '$balance',
          boundaries: BALANCE_BANDS.map((band) => band.min),
          default: lastBand,
          output: { count: { $sum: 1 } },
        },
      },
    ]),
    // A card's EXPIRED status is never stored — it is an unredeemed card past its date.
    GiftCardModel.aggregate<{ _id: string; value: number; count: number }>([
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$status', 'REDEEMED'] },
              'REDEEMED',
              { $cond: [{ $gt: ['$expires_at', now] }, 'ACTIVE', 'EXPIRED'] },
            ],
          },
          value: { $sum: '$balance' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);
  const coins = sumBy(ledger);
  return {
    outstanding: Math.round((coins.get('CREDIT') ?? 0) - (coins.get('DEBIT') ?? 0)),
    holders: new Map(holders.map((row) => [row._id, row.count])),
    cards: new Map(cards.map((row) => [row._id, row])),
  };
}

/** Per-day totals for the trends, in the admin's time zone. */
export async function loadRewardsDays(from: Date, to: Date, zone: string) {
  const range = inRange(from, to);
  const amountWhere = (field: string, value: string) => ({ $sum: { $cond: [{ $eq: [field, value] }, '$amount', 0] } });
  const [coins, codes, cards] = await Promise.all([
    CoinTransactionModel.aggregate<Keyed & { credited: number; spent: number; expired: number }>([
      { $match: { created_at: range } },
      {
        $group: {
          _id: dayKeyExpr('created_at', zone),
          credited: amountWhere('$type', 'CREDIT'),
          spent: amountWhere('$source', 'PAYMENT_REDEEM'),
          expired: amountWhere('$source', 'COIN_EXPIRY'),
        },
      },
    ]),
    // A member's code is made the first time they open their invite screen.
    ReferralCodeModel.aggregate<Keyed & { value: number }>([
      { $match: { created_at: range } },
      { $group: { _id: dayKeyExpr('created_at', zone), value: { $sum: 1 } } },
    ]),
    GiftCardTransactionModel.aggregate<Keyed & { sold: number; redeemed: number }>([
      { $match: { created_at: range } },
      {
        $group: {
          _id: dayKeyExpr('created_at', zone),
          sold: amountWhere('$type', 'ISSUE'),
          redeemed: amountWhere('$type', 'REDEEM'),
        },
      },
    ]),
  ]);
  return { coins, codes, cards };
}

/** Gift cards sold in the period per theme; a Pod Shop card has no category and files under SHOP. */
export const loadCardThemes = (from: Date, to: Date) =>
  GiftCardModel.aggregate<{ _id: string; name: string; count: number }>([
    { $match: { created_at: inRange(from, to) } },
    {
      $group: {
        _id: { $toString: { $ifNull: ['$scope_category_id', 'SHOP'] } },
        name: { $first: '$scope_name' },
        count: { $sum: 1 },
      },
    },
  ]);

/** Referral coins each referrer earned in the period — for the ranking's few rows only. */
export async function referrerCoins(ids: readonly Types.ObjectId[], from: Date, to: Date) {
  if (ids.length === 0) return new Map<string, number>();
  const rows = await CoinTransactionModel.aggregate<{ _id: Types.ObjectId; value: number }>([
    { $match: { user_id: { $in: ids }, source: 'REFERRAL_EARN', created_at: inRange(from, to) } },
    { $group: { _id: '$user_id', value: { $sum: '$amount' } } },
  ]);
  return new Map(rows.map((row) => [row._id.toHexString(), Math.round(row.value)]));
}
