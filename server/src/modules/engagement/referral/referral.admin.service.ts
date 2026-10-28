import type { Types } from 'mongoose';
import { CoinTransactionModel } from '@modules/finance/coin/coin.model';
import { coinSettingsService } from '@modules/finance/coin/coin.settings.service';
import { loadUserMap, monthKeys } from '@utils/admin-ledger';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { ReferralCodeModel, ReferralModel } from './referral.model';
import {
  REFERRAL_SOURCES,
  loadPayers,
  loadReferralPayouts,
  memberOrCodeSearch,
  payoutOf,
  payoutStatus,
  type ReferralPayout,
  type ReferralPayoutStatus,
} from './referral.facts';

/**
 * Loyalty > Refer & Earn: the platform-wide reads behind its dashboard and its
 * referrers table. Nothing here writes. A referral is "joined" the moment its
 * code is redeemed at signup, "converted" once that new member pays for
 * anything, and "paid" once the ledger credited both sides.
 */

/** One member's code, as the referrers table reads it. */
interface ReferralCodeDoc {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  code: string;
  created_at: Date;
}

interface ReferralLite {
  _id: Types.ObjectId;
  referrer_user_id: Types.ObjectId;
  referred_user_id: Types.ObjectId;
  created_at: Date;
}

/** How many referrers the dashboard ranks. */
const TOP_REFERRERS = 10;

/** Allowlists for the shared table engine (referrersTable — DUNCIT TABLE CONTRACT v1).
 * The counts are joined after the page is read, so only the code row's own
 * fields sort and filter. */
const REFERRER_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['code'],
  sortFields: { code: 'code', created_at: 'created_at' },
  filterFields: {
    code: { type: 'string' },
    user_id: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const monthOf = (date: Date) => date.toISOString().slice(0, 7);

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

interface ReferrerTally {
  joined: number;
  converted: number;
  coins: number;
  last: Date | null;
}

/** Per referrer: how many they brought in, how many of those paid, and what the referrer was credited. */
function tallyReferrers(
  referrals: readonly ReferralLite[],
  payouts: ReadonlyMap<string, ReferralPayout>,
  payers: ReadonlySet<string>
): Map<string, ReferrerTally> {
  const byReferrer = new Map<string, ReferrerTally>();
  for (const r of referrals) {
    const key = String(r.referrer_user_id);
    const entry = byReferrer.get(key) ?? { joined: 0, converted: 0, coins: 0, last: null };
    entry.joined += 1;
    if (payers.has(String(r.referred_user_id))) entry.converted += 1;
    entry.coins += payoutOf(payouts, String(r._id)).referrer_coins;
    if (!entry.last || r.created_at > entry.last) entry.last = r.created_at;
    byReferrer.set(key, entry);
  }
  return byReferrer;
}

/** Each referral's payout status, counted. */
function payoutCounts(referrals: readonly ReferralLite[], payouts: ReadonlyMap<string, ReferralPayout>) {
  const counts: Record<ReferralPayoutStatus, number> = { PAID: 0, PARTIAL: 0, UNPAID: 0 };
  for (const r of referrals) counts[payoutStatus(payoutOf(payouts, String(r._id)))] += 1;
  return counts;
}

/** Joined and converted per month of the window; a month outside it is skipped. */
function monthlySeries(
  keys: readonly string[],
  referrals: readonly ReferralLite[],
  payers: ReadonlySet<string>,
  coinsByMonth: ReadonlyMap<string, number>
) {
  const months = new Map(keys.map((month) => [month, { joined: 0, converted: 0 }]));
  for (const r of referrals) {
    const bucket = months.get(monthOf(r.created_at));
    if (!bucket) continue;
    bucket.joined += 1;
    if (payers.has(String(r.referred_user_id))) bucket.converted += 1;
  }
  // Every month in the window is emitted, so a quiet month reads as a zero bar.
  return keys.map((month) => ({
    month,
    joined: months.get(month)?.joined ?? 0,
    converted: months.get(month)?.converted ?? 0,
    coins: coinsByMonth.get(month) ?? 0,
  }));
}

/** The best referrers by people brought in, then by how many of them paid. */
async function topReferrers(tallies: Map<string, ReferrerTally>) {
  const ranked = [...tallies.entries()]
    .sort(([, a], [, b]) => b.joined - a.joined || b.converted - a.converted)
    .slice(0, TOP_REFERRERS);
  const ids = ranked.map(([id]) => id);
  const [users, codes] = await Promise.all([
    loadUserMap(ids),
    ReferralCodeModel.find({ user_id: { $in: ids } }).select('user_id code').lean(),
  ]);
  const codeOf = new Map(codes.map((c) => [String(c.user_id), c.code]));
  return ranked.map(([id, tally]) => ({
    user_id: id,
    name: users.get(id)?.name ?? '',
    email: users.get(id)?.email ?? '',
    code: codeOf.get(id) ?? '',
    joined: tally.joined,
    converted: tally.converted,
    coins: tally.coins,
  }));
}

export const referralAdminService = {
  /**
   * The whole referral programme on one page: codes handed out and how many
   * still wait for a first signup, members who joined through a code and how
   * many of them have paid, the coins it cost and whether every payout landed.
   * The totals are all-time; `months` bounds only the month-by-month series.
   */
  async stats(months?: number | null) {
    const span = Math.min(36, Math.max(1, Math.trunc(months ?? 12)));
    const keys = monthKeys(span);
    const from = new Date(`${keys[0]}-01T00:00:00.000Z`);

    const [codesIssued, referrals, payouts, coinMonths, coinsPerReferral] = await Promise.all([
      ReferralCodeModel.countDocuments(),
      ReferralModel.find().select('referrer_user_id referred_user_id created_at').lean<ReferralLite[]>(),
      loadReferralPayouts(),
      CoinTransactionModel.aggregate<{ _id: string; coins: number }>([
        { $match: { source: { $in: REFERRAL_SOURCES }, created_at: { $gte: from } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$created_at', timezone: 'UTC' } },
            coins: { $sum: '$amount' },
          },
        },
      ]),
      coinSettingsService.coinsPerReferral(),
    ]);
    const payers = await loadPayers(referrals.map((r) => r.referred_user_id));
    const tallies = tallyReferrers(referrals, payouts, payers);
    const converted = referrals.filter((r) => payers.has(String(r.referred_user_id))).length;
    const payoutTotals = [...payouts.values()];
    const referrerCoins = payoutTotals.reduce((sum, p) => sum + p.referrer_coins, 0);
    const newMemberCoins = payoutTotals.reduce((sum, p) => sum + p.referred_coins, 0);
    const counts = payoutCounts(referrals, payouts);

    return {
      codes_issued: codesIssued,
      active_referrers: tallies.size,
      // A code is made the first time a member opens Refer & Earn; one that has
      // never been redeemed is a member still waiting on their first signup.
      idle_codes: Math.max(0, codesIssued - tallies.size),
      total_referrals: referrals.length,
      converted,
      awaiting_first_payment: referrals.length - converted,
      conversion_pct: percent(converted, referrals.length),
      coins_paid: referrerCoins + newMemberCoins,
      referrer_coins: referrerCoins,
      new_member_coins: newMemberCoins,
      payouts_paid: counts.PAID,
      payouts_partial: counts.PARTIAL,
      payouts_unpaid: counts.UNPAID,
      coins_per_referral: coinsPerReferral,
      monthly: monthlySeries(keys, referrals, payers, new Map(coinMonths.map((m) => [m._id, m.coins]))),
      top_referrers: await topReferrers(tallies),
    };
  },

  /**
   * Every member's referral code with what it has brought in. A code with no
   * signups yet is listed too — that is the member still waiting on their
   * first. The search box finds a code, or the member by name, email or phone.
   */
  async referrersTable(input?: TableQueryInput | null) {
    const { search, ...rest } = input ?? {};
    const baseFilter = await memberOrCodeSearch(search, ['user_id']);
    const { docs, total, page, page_size } = await runTableQuery<ReferralCodeDoc>(
      ReferralCodeModel,
      baseFilter,
      rest,
      REFERRER_TABLE_CONFIG
    );
    const userIds = docs.map((d) => d.user_id);
    const [users, referrals] = await Promise.all([
      loadUserMap(userIds.map(String)),
      ReferralModel.find({ referrer_user_id: { $in: userIds } })
        .select('referrer_user_id referred_user_id created_at')
        .lean<ReferralLite[]>(),
    ]);
    const [payouts, payers] = await Promise.all([
      loadReferralPayouts(referrals.map((r) => String(r._id))),
      loadPayers(referrals.map((r) => r.referred_user_id)),
    ]);
    const tallies = tallyReferrers(referrals, payouts, payers);
    const rows = docs.map((d) => {
      const id = String(d.user_id);
      const tally = tallies.get(id);
      return {
        id: String(d._id),
        user_id: id,
        name: users.get(id)?.name ?? '',
        email: users.get(id)?.email ?? '',
        code: d.code,
        created_at: d.created_at.toISOString(),
        joined: tally?.joined ?? 0,
        converted: tally?.converted ?? 0,
        coins_earned: tally?.coins ?? 0,
        last_referral_at: tally?.last?.toISOString() ?? null,
      };
    });
    return { rows, total, page, page_size };
  },
};
