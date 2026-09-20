import { toTemplateCategory, WA_TEMPLATE_CATEGORIES } from '@modules/crm/marketing/waPricing.model';
import { consoleLink } from './links';
import { splitPeriod, sumBy } from './aggregates';
import type { AnalyticsWindow } from './window';
import {
  breakdown,
  fixedSlices,
  kpi,
  linkEverything,
  pct,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsLeaderboard,
  type EntityAnalyticsSections,
} from './shapes';
import { loadCampaignDays, loadLogDays, loadWaCostMix, type WaCostDayRow } from './waCosts.data';

/**
 * Analytics > Costing > WhatsApp — what Duncit's WhatsApp messages cost, in
 * rupees: automatic messages, marketing campaigns, one-time codes and tests,
 * each at the rate it froze when it went out. A failed or skipped message is
 * never billed, so only sent ones count.
 */

const WHATSAPP = consoleLink('communications', '/whatsapp');
// A message whose category AiSensy never reported is filed under "not set".
const CATEGORIES = [...WA_TEMPLATE_CATEGORIES, 'none'];
const SOURCES = ['AUTOMATIC', 'CAMPAIGNS', 'OTP', 'TESTS'];
const ITEM_COLUMNS = [
  { key: 'cost_messages', format: 'COUNT' },
  { key: 'cost_spend', format: 'CURRENCY' },
  { key: 'cost_share', format: 'PERCENT' },
] as const;

type Mix = Awaited<ReturnType<typeof loadWaCostMix>>;

/** Messages and spend filed under one slice key. */
interface Share {
  key: string;
  messages: number;
  spend: number;
}

/** Rupees to the paisa. */
const rupees = (value: number) => Math.round(value * 100) / 100;

const keyOf = (share: Share) => share.key;
const categoryOf = (raw: string | null) => toTemplateCategory(raw) ?? 'none';

const spendMap = (shares: readonly Share[]) =>
  new Map([...sumBy(shares, keyOf, (share) => share.spend)].map(([key, value]) => [key, rupees(value)]));
const messageMap = (shares: readonly Share[]) => sumBy(shares, keyOf, (share) => share.messages);

function costBreakdowns(mix: Mix): AnalyticsBreakdown[] {
  const byCategory: Share[] = [
    ...mix.categories.map((row) => ({ key: categoryOf(row._id), messages: row.messages, spend: row.spend })),
    ...mix.campaigns.map((row) => ({ key: categoryOf(row.category), messages: row.messages, spend: row.spend })),
  ];
  const bySource: Share[] = [
    ...mix.sources.map((row) => ({ key: String(row._id), messages: row.messages, spend: row.spend })),
    ...mix.campaigns.map((row) => ({ key: 'CAMPAIGNS', messages: row.messages, spend: row.spend })),
  ];
  const money = { format: 'CURRENCY' } as const;
  return [
    breakdown('wa_cost_by_category', fixedSlices(CATEGORIES, spendMap(byCategory)), money),
    breakdown('wa_cost_messages_by_category', fixedSlices(CATEGORIES, messageMap(byCategory))),
    breakdown('wa_cost_by_source', fixedSlices(SOURCES, spendMap(bySource)), money),
    breakdown('wa_cost_messages_by_source', fixedSlices(SOURCES, messageMap(bySource))),
  ];
}

/** The ten scenarios and campaigns that cost the most, and their share of the whole bill. */
function itemLeaderboard(mix: Mix, totalSpend: number): AnalyticsLeaderboard {
  const items = [
    ...mix.items.map((row) => ({ ...row, id: `event:${row._id}` })),
    ...mix.campaigns.map((row) => ({ ...row, id: `campaign:${String(row._id)}` })),
  ];
  items.sort((a, b) => b.spend - a.spend || b.messages - a.messages || a.name.localeCompare(b.name));
  return {
    key: 'wa_cost_items',
    columns: [...ITEM_COLUMNS],
    rows: items.slice(0, 10).map((item) => ({
      id: item.id,
      name: item.name,
      caption: toTemplateCategory(item.category),
      values: [item.messages, rupees(item.spend), pct(item.spend, totalSpend)],
    })),
  };
}

export async function whatsappCostAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [logDays, campaignDays, mix] = await Promise.all([
    loadLogDays(window),
    loadCampaignDays(window),
    loadWaCostMix(window.from, window.to),
  ]);
  const logged = (valueOf: (row: WaCostDayRow) => number) => splitPeriod(logDays, window, valueOf);
  const sent = (valueOf: (row: WaCostDayRow) => number) => splitPeriod(campaignDays, window, valueOf);
  const logSpend = logged((row) => row.spend);
  const logMessages = logged((row) => row.messages);
  const campaignSpend = sent((row) => row.spend);
  const campaignMessages = sent((row) => row.messages);
  const campaigns = sent((row) => row.campaigns);
  const zeroRate = splitPeriod([...logDays, ...campaignDays], window, (row) => row.zero_rate);
  const spend = { now: logSpend.now + campaignSpend.now, before: logSpend.before + campaignSpend.before };
  const messages = { now: logMessages.now + campaignMessages.now, before: logMessages.before + campaignMessages.before };
  const per100 = (amount: number, count: number) => (count > 0 ? rupees((amount / count) * 100) : 0);
  const money = { format: 'CURRENCY', higherIsBetter: false } as const;

  const sections: EntityAnalyticsSections = {
    kpis: [
      kpi('wa_cost_spend', rupees(spend.now), rupees(spend.before), money),
      kpi('wa_cost_per_day', rupees(spend.now / window.days), rupees(spend.before / window.days), money),
      kpi('wa_cost_messages', messages.now, messages.before),
      kpi('wa_cost_per_100', per100(spend.now, messages.now), per100(spend.before, messages.before), money),
      kpi('wa_cost_automatic_spend', rupees(logSpend.now), rupees(logSpend.before), money),
      kpi('wa_cost_campaign_spend', rupees(campaignSpend.now), rupees(campaignSpend.before), money),
      kpi('wa_cost_campaigns', campaigns.now, campaigns.before),
      kpi('wa_cost_zero_rate', zeroRate.now, zeroRate.before, { higherIsBetter: false }),
    ],
    trends: [
      trend(
        'wa_cost_spend',
        window,
        [
          { key: 'wa_cost_automatic_spend', values: logSpend.series.map(rupees) },
          { key: 'wa_cost_campaign_spend', values: campaignSpend.series.map(rupees) },
        ],
        'CURRENCY'
      ),
      trend('wa_cost_messages', window, [
        { key: 'wa_cost_automatic_messages', values: logMessages.series },
        { key: 'wa_cost_campaign_messages', values: campaignMessages.series },
      ]),
    ],
    breakdowns: costBreakdowns(mix),
    leaderboard: itemLeaderboard(mix, spend.now),
  };
  return linkEverything(sections, WHATSAPP);
}
