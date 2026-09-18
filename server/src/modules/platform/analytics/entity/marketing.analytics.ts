import { JOURNEY_STEPS } from '@modules/crm/marketing/shortLinkClick.model';
import { shortLinkOptions } from '@modules/crm/marketing/shortLink.options';
import { consoleLink } from './links';
import { seriesFromDays, type AnalyticsWindow } from './window';
import {
  breakdown,
  countMap,
  fixedSlices,
  kpi,
  linkEverything,
  pct,
  rankedSlices,
  topSlices,
  total,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsKpi,
  type AnalyticsLeaderboard,
  type EntityAnalyticsSections,
} from './shapes';
import {
  clicksByLink,
  countLaunchedCities,
  funnelSteps,
  loadLinkMeta,
  loadMarketingPeriod,
  loadWaitingCities,
  marketingFigures,
  type LinkClicks,
  type LinkMeta,
  type MarketingPeriod,
  type WaitingCity,
} from './marketing.data';
import { sumBy } from './aggregates';

/**
 * Analytics > Marketing — whether the links, coupons and campaigns Marketing
 * hands out bring people in: clicks and what they led to, codes redeemed and
 * what they cost, and how close each waiting city is to its launch goal.
 */

const DASHBOARD = consoleLink('marketing', '/');
const LINKS = consoleLink('marketing', '/short-links');
const COUPONS = consoleLink('marketing', '/coupons');
const WAITLIST = consoleLink('admin', '/location-subscriptions');

/**
 * Sources and mediums are named by the server's own option list — the same
 * words the Short Links console offers in its dropdowns, so a chart never
 * calls a channel something the marketer did not pick.
 */
const options = shortLinkOptions();
const SOURCE_NAMES = new Map(options.sources.map((option) => [option.value, option.label]));
const MEDIUM_NAMES = new Map(options.mediums.map((option) => [option.value, option.label]));

interface CityCounts {
  launched: number;
  waiting: number;
}

function marketingKpis(current: MarketingPeriod, previous: MarketingPeriod, cities: CityCounts): AnalyticsKpi[] {
  const now = marketingFigures(current);
  const before = marketingFigures(previous);
  return [
    kpi('mkt_links_created', now.links_created, before.links_created, { link: LINKS }),
    kpi('mkt_clicks', now.clicks, before.clicks, { link: LINKS }),
    kpi('mkt_signups', now.signups, before.signups, { link: LINKS }),
    kpi('mkt_signup_rate', now.signup_rate, before.signup_rate, { format: 'PERCENT', link: LINKS }),
    kpi('mkt_bookings', now.bookings, before.bookings, { link: LINKS }),
    kpi('mkt_link_revenue', now.link_revenue, before.link_revenue, { format: 'CURRENCY', link: LINKS }),
    kpi('mkt_coupons_redeemed', now.coupons_redeemed, before.coupons_redeemed, { link: COUPONS }),
    kpi('mkt_discount_given', now.discount_given, before.discount_given, {
      format: 'CURRENCY',
      higherIsBetter: false,
      link: COUPONS,
    }),
    kpi('mkt_waitlist_joins', now.waitlist_joins, before.waitlist_joins, { link: WAITLIST }),
    kpi('mkt_cities_launched', cities.launched, null, { link: WAITLIST }),
    kpi('mkt_cities_waiting', cities.waiting, null, { link: WAITLIST }),
    kpi('mkt_campaigns_sent', now.campaigns_sent, before.campaigns_sent, {
      link: consoleLink('marketing', '/campaigns/email'),
    }),
  ];
}

function marketingTrends(period: MarketingPeriod, window: AnalyticsWindow) {
  const daily = <T extends { _id: string }>(rows: readonly T[], valueOf: (row: T) => number) =>
    seriesFromDays(
      rows.map((row) => ({ _id: row._id, value: valueOf(row) })),
      window
    );
  const couponDays = period.coupons.map((row) => ({ ...row, _id: row._id.day }));
  const traffic = [
    { key: 'mkt_clicks', values: daily(period.clicks, (row) => row.clicks) },
    { key: 'mkt_signups', values: daily(period.clicks, (row) => row.signups) },
  ];
  const results = [
    { key: 'mkt_bookings', values: daily(period.conversions, (row) => row.payments) },
    { key: 'mkt_coupons_redeemed', values: daily(couponDays, (row) => row.count) },
    { key: 'mkt_waitlist_joins', values: seriesFromDays(period.waitlist, window) },
  ];
  const money = [
    { key: 'mkt_link_revenue', values: daily(period.conversions, (row) => row.amount) },
    { key: 'mkt_discount_given', values: daily(couponDays, (row) => row.discount) },
  ];
  return [
    trend('mkt_traffic', window, traffic, 'COUNT', LINKS),
    trend('mkt_results', window, results, 'COUNT', DASHBOARD),
    trend('mkt_money', window, money, 'CURRENCY', DASHBOARD),
  ];
}

interface BreakdownInput {
  links: readonly LinkClicks[];
  meta: ReadonlyMap<string, LinkMeta>;
  steps: ReadonlyArray<{ _id: string; count: number }>;
  period: MarketingPeriod;
  cities: readonly WaitingCity[];
}

function marketingBreakdowns({ links, meta, steps, period, cities }: BreakdownInput): AnalyticsBreakdown[] {
  // A link deleted since has no source or medium left to file its clicks under.
  const tagged = links.flatMap((row) => {
    const link = meta.get(row._id.toHexString());
    return link ? [{ clicks: row.clicks, source: link.source, medium: link.medium }] : [];
  });
  const bySource = sumBy(tagged, (row) => row.source, (row) => row.clicks);
  const byMedium = sumBy(tagged, (row) => row.medium, (row) => row.clicks);
  // Every click is CLICKED, whether or not its landing page ever reported back.
  const reached = countMap(steps);
  reached.set('CLICKED', total(links.map((row) => row.clicks)));
  const byCode = sumBy(period.coupons, (row) => row._id.code, (row) => row.count);
  const cityNames = new Map(cities.map((city) => [city.id, city.name]));
  const waiting = new Map(cities.map((city) => [city.id, city.subscribers]));
  const progress = new Map(cities.map((city) => [city.id, pct(city.subscribers, city.target)]));
  const allTime = { scope: 'ALL_TIME', link: WAITLIST } as const;
  return [
    breakdown('mkt_clicks_by_source', topSlices(bySource, SOURCE_NAMES), { link: LINKS }),
    breakdown('mkt_clicks_by_medium', topSlices(byMedium, MEDIUM_NAMES), { link: LINKS }),
    breakdown('mkt_click_funnel', fixedSlices(JOURNEY_STEPS, reached), { ordered: true, link: LINKS }),
    breakdown('mkt_coupons_by_code', rankedSlices(byCode, ([code]) => code, ([, count]) => count), { link: COUPONS }),
    breakdown('mkt_waitlist_by_city', topSlices(waiting, cityNames), allTime),
    breakdown('mkt_waitlist_progress', topSlices(progress, cityNames), { ...allTime, format: 'PERCENT' }),
  ];
}

/** The ten most-clicked links in the period, and what their clicks went on to do. */
function linkLeaderboard(links: readonly LinkClicks[], meta: ReadonlyMap<string, LinkMeta>): AnalyticsLeaderboard {
  const ranked = [...links].sort((a, b) => b.clicks - a.clicks || b.paid - a.paid).slice(0, 10);
  return {
    key: 'mkt_top_links',
    columns: [
      { key: 'mkt_clicks', format: 'COUNT' },
      { key: 'mkt_signups', format: 'COUNT' },
      { key: 'mkt_paid_clicks', format: 'COUNT' },
      { key: 'mkt_earned', format: 'CURRENCY' },
    ],
    link: LINKS,
    rows: ranked.map((row) => {
      const id = row._id.toHexString();
      const link = meta.get(id);
      // A link deleted since its clicks were recorded keeps its history under its code.
      return {
        id,
        name: link?.label ?? row.code,
        caption: link ? row.code : null,
        link: link ? consoleLink('marketing', `/short-links/${id}`) : null,
        values: [row.clicks, row.signups, row.paid, Math.round(row.earned)],
      };
    }),
  };
}

export async function marketingAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [current, previous, links, steps, cities, launched] = await Promise.all([
    loadMarketingPeriod(window.from, window.to, window.zone),
    loadMarketingPeriod(window.prevFrom, window.prevTo, window.zone),
    clicksByLink(window.from, window.to),
    funnelSteps(window.from, window.to),
    loadWaitingCities(),
    countLaunchedCities(),
  ]);
  const found = await loadLinkMeta(links.map((row) => row._id));
  const meta = new Map(found.map((link) => [link._id.toHexString(), link]));
  return linkEverything(
    {
      kpis: marketingKpis(current, previous, { launched, waiting: cities.length }),
      trends: marketingTrends(current, window),
      breakdowns: marketingBreakdowns({ links, meta, steps, period: current, cities }),
      leaderboard: linkLeaderboard(links, meta),
    },
    DASHBOARD
  );
}
