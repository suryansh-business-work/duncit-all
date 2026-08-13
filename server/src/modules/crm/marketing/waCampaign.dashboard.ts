import { WaCampaignModel } from './waCampaign.model';
import { getWaPricing } from './waPricing.model';

/**
 * What WhatsApp cost and reached over a window.
 *
 * Every figure is read from the campaigns themselves, never recomputed from the
 * current rate card: each send froze the rate it was created under, so a price
 * change today cannot rewrite what last month cost.
 */

/** Messages that actually went out, times the rate that send froze. */
const COST = { $multiply: ['$msg_rate', '$sent_count'] };

export interface WaDashboardRange {
  from?: string | null;
  to?: string | null;
}

/** A campaign belongs to the window it was CREATED in — a scheduled send that
 * has not run yet has no sent_at, and leaving it out would hide money that is
 * already committed. */
function matchFor(range: WaDashboardRange) {
  const created: Record<string, Date> = {};
  const from = range.from ? new Date(range.from) : null;
  const to = range.to ? new Date(range.to) : null;
  if (from && !Number.isNaN(from.getTime())) created.$gte = from;
  if (to && !Number.isNaN(to.getTime())) created.$lte = to;
  return Object.keys(created).length > 0 ? { created_at: created } : {};
}

interface CategoryRow {
  category: string;
  campaigns: number;
  messages: number;
  failed: number;
  skipped: number;
  cost: number;
}

async function byCategory(match: Record<string, unknown>): Promise<CategoryRow[]> {
  const rows = await WaCampaignModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $ifNull: ['$template_category', ''] },
        campaigns: { $sum: 1 },
        messages: { $sum: '$sent_count' },
        failed: { $sum: '$failed_count' },
        skipped: { $sum: '$skipped_count' },
        cost: { $sum: COST },
      },
    },
    { $sort: { cost: -1 } },
  ]).exec();
  return rows.map((row: any) => ({
    category: String(row._id ?? ''),
    campaigns: row.campaigns ?? 0,
    messages: row.messages ?? 0,
    failed: row.failed ?? 0,
    skipped: row.skipped ?? 0,
    cost: row.cost ?? 0,
  }));
}

/** The sends worth looking at first: the ones that cost the most. */
async function topCampaigns(match: Record<string, unknown>) {
  const rows = await WaCampaignModel.aggregate([
    { $match: match },
    { $addFields: { cost: COST } },
    { $sort: { cost: -1, created_at: -1 } },
    { $limit: 5 },
  ]).exec();
  return rows.map((row: any) => ({
    campaign_id: row.campaign_id,
    name: row.name,
    wa_campaign_name: row.wa_campaign_name,
    template_category: row.template_category ?? '',
    messages: row.sent_count ?? 0,
    cost: row.cost ?? 0,
    status: row.status,
    sent_at: row.sent_at ? new Date(row.sent_at).toISOString() : null,
  }));
}

const sum = (rows: CategoryRow[], key: keyof CategoryRow) =>
  rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);

export async function waDashboard(range: WaDashboardRange = {}) {
  const match = matchFor(range);
  const [pricing, categories, top] = await Promise.all([
    getWaPricing(),
    byCategory(match),
    topCampaigns(match),
  ]);
  return {
    currency_symbol: pricing.currency_symbol ?? '₹',
    campaigns: sum(categories, 'campaigns'),
    messages_sent: sum(categories, 'messages'),
    messages_failed: sum(categories, 'failed'),
    messages_skipped: sum(categories, 'skipped'),
    total_cost: sum(categories, 'cost'),
    by_category: categories,
    top_campaigns: top,
  };
}
