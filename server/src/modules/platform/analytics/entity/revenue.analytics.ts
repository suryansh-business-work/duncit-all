import { consoleLink } from './links';
import { categoryNames, locationNames } from './lookups';
import { seriesFromDays, type AnalyticsWindow } from './window';
import {
  breakdown,
  fixedSlices,
  kpi,
  linkEverything,
  mean,
  pct,
  topSlices,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsFormat,
  type AnalyticsKpi,
  type AnalyticsLeaderboard,
  type AnalyticsTrend,
  type EntityAnalyticsSections,
} from './shapes';
import {
  loadPaymentMix,
  loadPayoutsOwed,
  loadPodMoney,
  loadRevenueDays,
  loadRevenuePeriod,
  podPlaces,
  type PodMoney,
  type RevenuePeriod,
} from './revenue.data';
import { column } from './aggregates';

/**
 * Analytics > Money > Revenue & Finance — what came in, what went back, what
 * Duncit kept and what it owes partners. Payments count by when they were
 * made, refunds by when they were paid back, releases by when Finance
 * approved them and withdrawals by when they were transferred.
 */

const DASHBOARD = consoleLink('finance', '/');
const LOGS = consoleLink('finance', '/payment-logs');
const REFUNDS = consoleLink('finance', '/user-refund-logs');
const RELEASES = consoleLink('finance', '/payment-release');
const WITHDRAWALS = consoleLink('finance', '/withdrawals');
const POD_FINANCE = consoleLink('finance', '/pod-finance');

const PURPOSES = ['POD', 'PRODUCT', 'GIFT_CARD', 'OTHER'] as const;
const PAYOUT_PARTIES = ['DUNCIT', 'HOST_PAYMENT', 'VENUE_BILLING', 'CLUB_ADMIN', 'ECOMM_PAYMENT'] as const;
const OWED = ['releases_pending', 'wallet_balance', 'withdrawals_pending'] as const;
const MONEY: AnalyticsFormat = 'CURRENCY';

const add = (totals: Map<string, number>, key: string, value: number) =>
  totals.set(key, (totals.get(key) ?? 0) + value);

/** Each tile's value for one period — computed identically for both periods. */
const revenueFigures = (period: RevenuePeriod) => ({
  ...period,
  refund_rate: pct(period.refunded, period.collected),
  net: period.collected - period.refunded,
  avg_payment: mean(period.collected, period.captured),
  success_rate: pct(period.captured, period.captured + period.failed),
});

function revenueKpis(current: RevenuePeriod, previous: RevenuePeriod, pendingNow: number): AnalyticsKpi[] {
  const now = revenueFigures(current);
  const was = revenueFigures(previous);
  const worse = { higherIsBetter: false, link: REFUNDS };
  return [
    kpi('fin_collected', now.collected, was.collected, { format: MONEY, link: LOGS }),
    kpi('fin_refunds', now.refunds, was.refunds, worse),
    kpi('fin_refunded', now.refunded, was.refunded, { ...worse, format: MONEY }),
    kpi('fin_refund_rate', now.refund_rate, was.refund_rate, { ...worse, format: 'PERCENT' }),
    kpi('fin_net_revenue', now.net, was.net, { format: MONEY, link: LOGS }),
    kpi('fin_duncit_revenue', now.duncit, was.duncit, { format: MONEY, link: DASHBOARD }),
    kpi('fin_gst', now.gst, was.gst, { format: MONEY, link: DASHBOARD }),
    kpi('fin_avg_payment', now.avg_payment, was.avg_payment, { format: MONEY, link: LOGS }),
    kpi('fin_paying_users', now.payers, was.payers, { link: LOGS }),
    kpi('fin_success_rate', now.success_rate, was.success_rate, { format: 'PERCENT', link: LOGS }),
    kpi('fin_payouts_released', now.released, was.released, { format: MONEY, link: RELEASES }),
    kpi('fin_payouts_pending', pendingNow, null, { format: MONEY, higherIsBetter: false, link: RELEASES }),
  ];
}

function revenueTrends(window: AnalyticsWindow, days: Awaited<ReturnType<typeof loadRevenueDays>>): AnalyticsTrend[] {
  const series = (rows: Array<{ _id: string; value: number }>) => seriesFromDays(rows, window);
  const collected = series(column(days.payments, 'collected'));
  const refunded = series(column(days.refunds, 'amount'));
  const net = collected.map((value, index) => value - refunded[index]);
  const moneyTrend = [
    { key: 'fin_collected', values: collected },
    { key: 'fin_refunded', values: refunded },
    { key: 'fin_net_revenue', values: net },
  ];
  const paymentTrend = [
    { key: 'fin_successful', values: series(column(days.payments, 'captured')) },
    { key: 'fin_failed', values: series(column(days.payments, 'failed')) },
    { key: 'fin_refunds', values: series(column(days.refunds, 'count')) },
  ];
  const payoutTrend = [
    { key: 'fin_duncit_revenue', values: series(column(days.releases, 'duncit')) },
    { key: 'fin_payouts_released', values: series(column(days.releases, 'released')) },
    { key: 'fin_withdrawals_paid', values: series(column(days.withdrawals, 'amount')) },
  ];
  return [
    trend('fin_money', window, moneyTrend, MONEY, LOGS),
    trend('fin_payments', window, paymentTrend, 'COUNT', LOGS),
    trend('fin_payouts', window, payoutTrend, MONEY, WITHDRAWALS),
  ];
}

function moneyBreakdowns(
  mix: Awaited<ReturnType<typeof loadPaymentMix>>,
  current: RevenuePeriod,
  owed: Awaited<ReturnType<typeof loadPayoutsOwed>>
): AnalyticsBreakdown[] {
  const methods = new Map<string, number>();
  const purposes = new Map<string, number>();
  for (const row of mix) {
    add(methods, row._id.gateway ?? 'none', row.count);
    add(purposes, row._id.target ?? 'OTHER', Math.round(row.amount));
  }
  // Duncit's cut sits beside the partners' releases, so one chart shows who the settled money went to.
  const parties = new Map(current.byKind).set('DUNCIT', current.duncit);
  const owedSlices = OWED.map((key) => ({ key, label: null, value: owed[key] }));
  return [
    breakdown('fin_by_method', topSlices(methods, new Map()), { link: LOGS }),
    breakdown('fin_by_purpose', fixedSlices(PURPOSES, purposes), { format: MONEY, link: LOGS }),
    breakdown('fin_payout_split', fixedSlices(PAYOUT_PARTIES, parties), { format: MONEY, link: POD_FINANCE }),
    breakdown('fin_payouts_owed', owedSlices, { format: MONEY, scope: 'ALL_TIME', ordered: true, link: WITHDRAWALS }),
  ];
}

/** Pod-ticket money by city and category, and the ten pods that took the most. */
async function podSections(rows: readonly PodMoney[]) {
  const places = await podPlaces(rows);
  const cities = new Map<string, number>();
  const categories = new Map<string, number>();
  for (const row of rows) {
    const id = row._id.toHexString();
    add(cities, places.cityOf(id), Math.round(row.collected));
    add(categories, places.categoryOf(id), Math.round(row.collected));
  }
  const [cityNames, categoryNameMap] = await Promise.all([locationNames(cities.keys()), categoryNames(categories.keys())]);
  const ranked = [...rows].sort((a, b) => b.collected - a.collected).slice(0, 10);
  const leaderRow = (row: PodMoney) => {
    const id = row._id.toHexString();
    return {
      id,
      name: places.titleOf(id),
      caption: cityNames.get(places.cityOf(id)) ?? null,
      values: [Math.round(row.collected), row.payments, mean(row.collected, row.payments), Math.round(row.refunded)],
      link: consoleLink('finance', `/pod-finance/${id}`),
    };
  };
  const leaderboard: AnalyticsLeaderboard = {
    key: 'fin_top_pods',
    columns: [
      { key: 'fin_col_collected', format: MONEY },
      { key: 'fin_col_payments', format: 'COUNT' },
      { key: 'fin_col_avg_payment', format: MONEY },
      { key: 'fin_col_refunded', format: MONEY },
    ],
    rows: ranked.map(leaderRow),
    link: POD_FINANCE,
  };
  return {
    breakdowns: [
      breakdown('fin_by_city', topSlices(cities, cityNames), { format: MONEY, link: POD_FINANCE }),
      breakdown('fin_by_category', topSlices(categories, categoryNameMap), { format: MONEY, link: POD_FINANCE }),
    ],
    leaderboard,
  };
}

export async function revenueAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [current, previous, owed, days, mix, podMoney] = await Promise.all([
    loadRevenuePeriod(window.from, window.to),
    loadRevenuePeriod(window.prevFrom, window.prevTo),
    loadPayoutsOwed(),
    loadRevenueDays(window.from, window.to, window.zone),
    loadPaymentMix(window.from, window.to),
    loadPodMoney(window.from, window.to),
  ]);
  const pods = await podSections(podMoney);

  return linkEverything(
    {
      kpis: revenueKpis(current, previous, owed.releases_pending),
      trends: revenueTrends(window, days),
      breakdowns: [...pods.breakdowns, ...moneyBreakdowns(mix, current, owed)],
      leaderboard: pods.leaderboard,
    },
    DASHBOARD
  );
}
