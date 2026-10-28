import { formatMoney } from '@duncit/utils';
import type { Translator } from '@duncit/app-settings';
import { coinCount } from '../duncit-coin/queries';
import { totalLiability, type LoyaltyOverview } from './useLoyaltyOverview';

type Translate = Translator['t'];

/** How a line reads: good news, worth a look, or plain context. */
export type InsightTone = 'success' | 'warning' | 'info';

export interface Insight {
  key: string;
  tone: InsightTone;
  text: string;
}

/** A share as a whole-ish percentage; null when there is nothing to share out. */
const share = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** Coins granted vs spent: all-time, then over the chosen window. */
function coinInsights(t: Translate, { coins }: LoyaltyOverview, months: number): Insight[] {
  if (!coins) return [];
  const out: Insight[] = [];
  const spent = share(coins.total_redeemed, coins.total_circulated);
  if (spent != null) {
    out.push({
      key: 'coin-spent',
      tone: spent >= 50 ? 'success' : 'info',
      text: t('loyalty.dashboard.insightCoinSpent', { vars: { pct: spent, outstanding: coinCount(coins.total_outstanding) } }),
    });
  }
  const earned = sum(coins.monthly.map((m) => m.earned));
  const redeemed = sum(coins.monthly.map((m) => m.redeemed));
  out.push({
    key: 'coin-window',
    tone: 'info',
    text: t('loyalty.dashboard.insightCoinWindow', { vars: { n: months, earned: coinCount(earned), spent: coinCount(redeemed) } }),
  });
  return out;
}

/** Who joined through a code, who paid since, and whether every payout landed. */
function referralInsights(t: Translate, { referrals }: LoyaltyOverview): Insight[] {
  if (!referrals || referrals.codes_issued === 0) return [];
  const out: Insight[] = [];
  if (referrals.total_referrals > 0) {
    out.push({
      key: 'referral-conversion',
      tone: referrals.conversion_pct >= 50 ? 'success' : 'info',
      text: t('loyalty.dashboard.insightReferralConversion', {
        vars: { pct: referrals.conversion_pct, awaiting: coinCount(referrals.awaiting_first_payment) },
      }),
    });
  }
  out.push({
    key: 'referral-idle',
    tone: 'info',
    text: t('loyalty.dashboard.insightReferralIdle', {
      vars: { idle: coinCount(referrals.idle_codes), codes: coinCount(referrals.codes_issued) },
    }),
  });
  const incomplete = referrals.payouts_partial + referrals.payouts_unpaid;
  if (incomplete > 0) {
    out.push({ key: 'referral-payouts', tone: 'warning', text: t('loyalty.dashboard.insightReferralPayouts', { vars: { n: incomplete } }) });
  }
  return out;
}

/** How much of what was sold or printed has been turned into coins. */
function cardInsights(t: Translate, { cards, printed }: LoyaltyOverview): Insight[] {
  const out: Insight[] = [];
  const virtual = cards ? share(cards.redeemed_value, cards.sold_value) : null;
  if (cards && virtual != null) {
    out.push({
      key: 'virtual-redeemed',
      tone: 'info',
      text: t('loyalty.dashboard.insightVirtual', {
        vars: { pct: virtual, outstanding: formatMoney(cards.outstanding_value, { symbol: cards.currency_symbol }) },
      }),
    });
  }
  const physical = printed ? share(printed.redeemed_coins, printed.generated_coins) : null;
  if (printed && physical != null) {
    out.push({
      key: 'physical-redeemed',
      tone: 'info',
      text: t('loyalty.dashboard.insightPhysical', { vars: { pct: physical, outstanding: coinCount(printed.outstanding_coins) } }),
    });
  }
  return out;
}

/** Where the reward liability sits — coins held by members are usually most of it. */
function liabilityInsight(t: Translate, overview: LoyaltyOverview): Insight[] {
  const total = totalLiability(overview);
  const coinShare = total && overview.coins ? share(overview.coins.total_outstanding, total) : null;
  if (coinShare == null) return [];
  return [{ key: 'liability-coins', tone: 'info', text: t('loyalty.dashboard.insightLiability', { vars: { pct: coinShare } }) }];
}

/**
 * The plain-words reading of the numbers on the Loyalty home: each line is
 * computed from the same stats the tiles and charts show, so the words can
 * never say something the numbers beside them do not.
 */
export function buildInsights(t: Translate, overview: LoyaltyOverview, months: number): Insight[] {
  const lines = [
    ...liabilityInsight(t, overview),
    ...coinInsights(t, overview, months),
    ...referralInsights(t, overview),
    ...cardInsights(t, overview),
  ];
  // Anything that needs a look reads first.
  return [...lines.filter((line) => line.tone === 'warning'), ...lines.filter((line) => line.tone !== 'warning')];
}
