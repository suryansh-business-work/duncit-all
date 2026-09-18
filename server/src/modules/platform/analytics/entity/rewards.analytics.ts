import type { Types } from 'mongoose';
import { consoleLink } from './links';
import { userNames } from './lookups';
import { dayTotals, seriesFromDays, type AnalyticsWindow } from './window';
import { column } from './aggregates';
import {
  breakdown,
  fixedSlices,
  kpi,
  linkEverything,
  pct,
  topSlices,
  total,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsKpi,
  type AnalyticsLeaderboard,
  type EntityAnalyticsSections,
} from './shapes';
import {
  BALANCE_BANDS,
  loadCardThemes,
  loadRewardsDays,
  loadRewardsLive,
  loadRewardsPeriod,
  referrerCoins,
  type RewardsPeriod,
} from './rewards.data';

/**
 * Analytics > Money > Coins, Referrals & Gift Cards — the rewards Duncit hands
 * out and what members do with them. Coin rows, referrals and gift card moves
 * all count by when they happened; the balances are as they stand now.
 */

const COIN_DASHBOARD = consoleLink('finance', '/duncit-coin/dashboard');
const COIN_LEDGER = consoleLink('finance', '/duncit-coin/transactions');
const REFERRALS = consoleLink('finance', '/referrals');
const CARD_DASHBOARD = consoleLink('finance', '/gift-cards/dashboard');
const CARDS = consoleLink('finance', '/gift-cards/cards');
const CARD_LOGS = consoleLink('finance', '/gift-cards/logs');

const CREDIT_SOURCES = [
  'PAYMENT_EARN',
  'REFERRAL_EARN',
  'REFERRAL_SIGNUP',
  'POD_FEEDBACK',
  'GIFT_CARD_REDEEM',
  'PAYMENT_REFUND',
  'ADMIN_GRANT',
] as const;
const DEBIT_SOURCES = ['PAYMENT_REDEEM', 'COIN_EXPIRY', 'ADMIN_DEDUCT'] as const;
const CARD_STATES = ['ACTIVE', 'REDEEMED', 'EXPIRED'] as const;

type Live = Awaited<ReturnType<typeof loadRewardsLive>>;

const coins = (totals: ReadonlyMap<string, number>, ...sources: string[]) =>
  Math.round(total(sources.map((source) => totals.get(source) ?? 0)));

/** Each tile's value for one period — computed identically for both periods. */
const rewardFigures = (period: RewardsPeriod) => ({
  credited: Math.round(total([...period.credits.values()])),
  spent: coins(period.debits, 'PAYMENT_REDEEM'),
  expired: coins(period.debits, 'COIN_EXPIRY'),
  checkout: period.checkout_coins,
  joined: period.referrals.length,
  conversion: pct(period.converted.size, period.referrals.length),
  referral_coins: coins(period.credits, 'REFERRAL_EARN', 'REFERRAL_SIGNUP'),
  cards_sold: period.cards_sold,
  value_sold: period.value_sold,
  value_redeemed: period.value_redeemed,
});

function rewardKpis(current: RewardsPeriod, previous: RewardsPeriod, live: Live): AnalyticsKpi[] {
  const now = rewardFigures(current);
  const was = rewardFigures(previous);
  const outstandingCards = Math.round(live.cards.get('ACTIVE')?.value ?? 0);
  return [
    kpi('rew_coins_credited', now.credited, was.credited, { link: COIN_LEDGER }),
    kpi('rew_coins_spent', now.spent, was.spent, { link: COIN_LEDGER }),
    kpi('rew_coins_expired', now.expired, was.expired, { higherIsBetter: false, link: COIN_LEDGER }),
    kpi('rew_coins_outstanding', live.outstanding, null, { link: COIN_DASHBOARD }),
    kpi('rew_coin_checkout_value', now.checkout, was.checkout, { format: 'CURRENCY', link: COIN_LEDGER }),
    kpi('rew_referrals_joined', now.joined, was.joined, { link: REFERRALS }),
    kpi('rew_referral_conversion', now.conversion, was.conversion, { format: 'PERCENT', link: REFERRALS }),
    kpi('rew_referral_coins', now.referral_coins, was.referral_coins, { link: COIN_LEDGER }),
    kpi('rew_gift_cards_sold', now.cards_sold, was.cards_sold, { link: CARDS }),
    kpi('rew_gift_card_value_sold', now.value_sold, was.value_sold, { format: 'CURRENCY', link: CARD_DASHBOARD }),
    kpi('rew_gift_card_redeemed', now.value_redeemed, was.value_redeemed, { format: 'CURRENCY', link: CARD_LOGS }),
    kpi('rew_gift_card_outstanding', outstandingCards, null, { format: 'CURRENCY', link: CARD_DASHBOARD }),
  ];
}

async function rewardBreakdowns(window: AnalyticsWindow, period: RewardsPeriod, live: Live): Promise<AnalyticsBreakdown[]> {
  const themes = await loadCardThemes(window.from, window.to);
  // A Pod Shop card has no category name of its own; the console names it.
  const themeNames = new Map(themes.filter((row) => row.name).map((row) => [row._id, row.name]));
  const holders = BALANCE_BANDS.map((band) => ({ key: band.key, label: null, value: live.holders.get(band.min) ?? 0 }));
  const cardStates = new Map<string, number>(CARD_STATES.map((state) => [state, live.cards.get(state)?.count ?? 0]));
  const rounded = (totals: ReadonlyMap<string, number>) =>
    new Map([...totals].map(([key, value]) => [key, Math.round(value)]));
  const now = { scope: 'ALL_TIME', ordered: true } as const;
  return [
    breakdown('rew_credit_sources', fixedSlices(CREDIT_SOURCES, rounded(period.credits)), { link: COIN_LEDGER }),
    breakdown('rew_debit_sources', fixedSlices(DEBIT_SOURCES, rounded(period.debits)), { link: COIN_LEDGER }),
    breakdown('rew_balance_bands', holders, { ...now, link: COIN_DASHBOARD }),
    breakdown('rew_gift_card_themes', topSlices(new Map(themes.map((row) => [row._id, row.count])), themeNames), {
      link: CARDS,
    }),
    breakdown('rew_gift_card_status', fixedSlices(CARD_STATES, cardStates), { ...now, link: CARDS }),
  ];
}

/** The ten members whose codes brought the most people in, with how many of them went on to pay. */
async function referrerLeaderboard(window: AnalyticsWindow, period: RewardsPeriod): Promise<AnalyticsLeaderboard> {
  const byReferrer = new Map<string, { id: Types.ObjectId; joined: number; converted: number }>();
  for (const row of period.referrals) {
    const key = row.referrer_user_id.toHexString();
    const entry = byReferrer.get(key) ?? { id: row.referrer_user_id, joined: 0, converted: 0 };
    entry.joined += 1;
    if (period.converted.has(row.referred_user_id.toHexString())) entry.converted += 1;
    byReferrer.set(key, entry);
  }
  const ranked = [...byReferrer.entries()]
    .sort(([, a], [, b]) => b.joined - a.joined || b.converted - a.converted)
    .slice(0, 10);
  const [names, earned] = await Promise.all([
    userNames(ranked.map(([key]) => key)),
    referrerCoins(ranked.map(([, entry]) => entry.id), window.from, window.to),
  ]);
  return {
    key: 'rew_top_referrers',
    columns: [
      { key: 'rew_col_joined', format: 'COUNT' },
      { key: 'rew_col_converted', format: 'COUNT' },
      { key: 'rew_col_conversion', format: 'PERCENT' },
      { key: 'rew_col_coins', format: 'COUNT' },
    ],
    rows: ranked.map(([key, entry]) => ({
      id: key,
      name: names.get(key) ?? '',
      caption: null,
      values: [entry.joined, entry.converted, pct(entry.converted, entry.joined), earned.get(key) ?? 0],
      link: consoleLink('admin', `/users/${key}`),
    })),
    link: REFERRALS,
  };
}

export async function rewardsAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [current, previous, live, days] = await Promise.all([
    loadRewardsPeriod(window.from, window.to),
    loadRewardsPeriod(window.prevFrom, window.prevTo),
    loadRewardsLive(window.to),
    loadRewardsDays(window.from, window.to, window.zone),
  ]);
  const series = (rows: Array<{ _id: string; value: number }>) => seriesFromDays(rows, window);
  const joined = dayTotals(current.referrals, (row) => row.created_at, window.zone);
  const coinTrend = [
    { key: 'rew_coins_credited', values: series(column(days.coins, 'credited')) },
    { key: 'rew_coins_spent', values: series(column(days.coins, 'spent')) },
    { key: 'rew_coins_expired', values: series(column(days.coins, 'expired')) },
  ];
  const referralTrend = [
    { key: 'rew_referral_codes', values: series(column(days.codes, 'value')) },
    { key: 'rew_referrals_joined', values: series(joined) },
  ];
  const cardTrend = [
    { key: 'rew_gift_card_value_sold', values: series(column(days.cards, 'sold')) },
    { key: 'rew_gift_card_redeemed', values: series(column(days.cards, 'redeemed')) },
  ];
  const [breakdowns, leaderboard] = await Promise.all([
    rewardBreakdowns(window, current, live),
    referrerLeaderboard(window, current),
  ]);

  return linkEverything(
    {
      kpis: rewardKpis(current, previous, live),
      trends: [
        trend('rew_coins', window, coinTrend, 'COUNT', COIN_LEDGER),
        trend('rew_referrals', window, referralTrend, 'COUNT', REFERRALS),
        trend('rew_gift_cards', window, cardTrend, 'CURRENCY', CARD_LOGS),
      ],
      breakdowns,
      leaderboard,
    },
    COIN_DASHBOARD
  );
}
