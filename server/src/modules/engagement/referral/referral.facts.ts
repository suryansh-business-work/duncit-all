import type { Types } from 'mongoose';
import { CoinTransactionModel } from '@modules/finance/coin/coin.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { UserModel } from '@modules/access/user/user.model';
import { CAPTURED } from '@modules/platform/analytics/entity/revenue.data';
import { escapeRegExp } from '@utils/regex';
import { userSearchFilter } from '@utils/user-search';

/** Members one search box may resolve to — enough for any name a person would type, bounded for `$in`. */
const SEARCH_MEMBER_CAP = 500;

/**
 * What the referral tables and the Loyalty > Refer & Earn dashboard know about a
 * referral beyond the row itself: what the ledger actually paid each side, and
 * whether the member it brought in has gone on to pay for anything.
 *
 * Both are READ from where they happened — the coin ledger and the payments —
 * never stored on the referral, so a late credit or a first purchase shows up
 * the moment it lands, and nothing can drift out of step with it.
 */

/** The two ledger sources a referral pays out through: the referrer, then the new member. */
export const REFERRAL_SOURCES = ['REFERRAL_EARN', 'REFERRAL_SIGNUP'] as const;

/**
 * PAID — both sides were credited. PARTIAL — only one was. UNPAID — neither:
 * the credit failed after the referral was recorded, or the rate was 0 coins
 * when the code was redeemed.
 */
export type ReferralPayoutStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

export interface ReferralPayout {
  referrer_coins: number;
  referred_coins: number;
}

const NO_PAYOUT: ReferralPayout = { referrer_coins: 0, referred_coins: 0 };

export const payoutOf = (payouts: ReadonlyMap<string, ReferralPayout>, referralId: string): ReferralPayout =>
  payouts.get(referralId) ?? NO_PAYOUT;

export function payoutStatus(payout: ReferralPayout): ReferralPayoutStatus {
  const sides = Number(payout.referrer_coins > 0) + Number(payout.referred_coins > 0);
  if (sides === 2) return 'PAID';
  return sides === 1 ? 'PARTIAL' : 'UNPAID';
}

/**
 * Coins the ledger paid each side, per referral. `referralIds` omitted reads
 * every referral payout there is — the dashboard's all-time figures.
 */
export async function loadReferralPayouts(referralIds?: readonly string[]): Promise<Map<string, ReferralPayout>> {
  if (referralIds?.length === 0) return new Map();
  const match: Record<string, unknown> = { source: { $in: REFERRAL_SOURCES }, referral_id: { $type: 'string' } };
  if (referralIds) match.referral_id = { $in: referralIds };
  const rows = await CoinTransactionModel.aggregate<{ _id: { referral: string; source: string }; coins: number }>([
    { $match: match },
    { $group: { _id: { referral: '$referral_id', source: '$source' }, coins: { $sum: '$amount' } } },
  ]);
  const payouts = new Map<string, ReferralPayout>();
  for (const row of rows) {
    const entry = { ...payoutOf(payouts, row._id.referral) };
    if (row._id.source === 'REFERRAL_EARN') entry.referrer_coins += row.coins;
    else entry.referred_coins += row.coins;
    payouts.set(row._id.referral, entry);
  }
  return payouts;
}

/** Members among `userIds` who have made at least one paid checkout — a code only counts once it brings a customer. */
export async function loadPayers(userIds: ReadonlyArray<Types.ObjectId | string>): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const payers = await PaymentModel.distinct('user_id', {
    user_id: { $in: userIds },
    status: { $in: CAPTURED },
  });
  return new Set(payers.map(String));
}

/**
 * The base filter behind a referral table's search box: the typed code, or any
 * member found by name, email or phone in one of `memberFields`. The table
 * engine can only search fields stored on the row, and the people are joined
 * after the page is read — so the search is resolved here, before the read, and
 * handed to the engine as a base filter in place of its own `search`.
 */
export async function memberOrCodeSearch(
  search: string | null | undefined,
  memberFields: readonly string[]
): Promise<Record<string, unknown>> {
  const term = (search ?? '').trim();
  if (!term) return {};
  const byCode = { code: new RegExp(escapeRegExp(term), 'i') };
  const members = userSearchFilter(term);
  if (!members) return byCode;
  const found = await UserModel.find(members).select('_id').limit(SEARCH_MEMBER_CAP).lean();
  if (found.length === 0) return byCode;
  const ids = found.map((user) => user._id);
  return { $or: [byCode, ...memberFields.map((field) => ({ [field]: { $in: ids } }))] };
}
