import { Types } from 'mongoose';
import { ShortLinkModel } from './shortLink.model';
import { ShortLinkClickModel } from './shortLinkClick.model';
import { MarketingCampaignModel } from './marketing.model';
import { AudienceListModel } from './audienceList.model';
import { AdRequestModel } from '@modules/ads/ads.model';

const DAY_MS = 86_400_000;

/** A percentage of a total, to one decimal — more precision than that is
 * noise at the volumes a single console sees. Guards the zero denominator so
 * an empty console reads 0%, never NaN. */
const rate = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

/** Top values of one click field, biggest first. */
async function clickBreakdown(since: Date, field: string, limit = 6) {
  const rows = await ShortLinkClickModel.aggregate<{ _id: string | null; count: number }>([
    { $match: { clicked_at: { $gte: since } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
  ]).exec();
  return rows.map((row) => ({ label: row._id ?? 'Unknown', count: row.count }));
}

async function linkSection(since: Date) {
  const [totals] = await ShortLinkClickModel.aggregate<{
    total: number;
    visitors: (string | null)[];
    paid: number;
    revenue: number;
  }>([
    { $match: { clicked_at: { $gte: since } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        visitors: { $addToSet: '$ip_hash' },
        // A click counts as converted when a payment was attributed to it.
        paid: { $sum: { $cond: [{ $gt: ['$converted_amount', 0] }, 1, 0] } },
        revenue: { $sum: { $ifNull: ['$converted_amount', 0] } },
      },
    },
  ]).exec();

  const daily = await ShortLinkClickModel.aggregate<{ _id: string; count: number }>([
    { $match: { clicked_at: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$clicked_at' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]).exec();

  const [platforms, countries] = await Promise.all([
    clickBreakdown(since, 'platform'),
    clickBreakdown(since, 'country'),
  ]);

  const clicks = totals?.total ?? 0;
  const paid = totals?.paid ?? 0;
  return {
    total_clicks: clicks,
    // $addToSet keeps nulls, which mean "could not tell", not a visitor.
    unique_visitors: (totals?.visitors ?? []).filter(Boolean).length,
    conversions: paid,
    revenue: totals?.revenue ?? 0,
    conversion_rate: rate(paid, clicks),
    daily: daily.map((point) => ({ date: point._id, count: point.count })),
    platforms,
    countries,
  };
}

/** The links that actually earned their traffic, ranked by clicks. */
async function topLinks(since: Date, limit = 5) {
  const rows = await ShortLinkClickModel.aggregate<{
    _id: Types.ObjectId;
    clicks: number;
    revenue: number;
  }>([
    { $match: { clicked_at: { $gte: since } } },
    {
      $group: {
        _id: '$short_link_id',
        clicks: { $sum: 1 },
        revenue: { $sum: { $ifNull: ['$converted_amount', 0] } },
      },
    },
    { $sort: { clicks: -1 } },
    { $limit: limit },
  ]).exec();

  const links = await ShortLinkModel.find({ _id: { $in: rows.map((row) => row._id) } })
    .select('label code')
    .lean()
    .exec();
  const byId = new Map(links.map((link) => [String(link._id), link]));

  return rows.map((row) => {
    const link = byId.get(String(row._id));
    return {
      id: String(row._id),
      // A link deleted since its clicks were recorded still has history.
      label: link?.label ?? 'Deleted link',
      code: link?.code ?? '',
      clicks: row.clicks,
      revenue: row.revenue,
    };
  });
}

async function campaignSection(since: Date) {
  const [totals] = await MarketingCampaignModel.aggregate<{
    sent: number;
    recipients: number;
    opens: number;
    clicks: number;
  }>([
    { $match: { status: 'SENT', sent_at: { $gte: since } } },
    {
      $group: {
        _id: null,
        sent: { $sum: 1 },
        recipients: { $sum: '$recipient_count' },
        opens: { $sum: '$open_count' },
        clicks: { $sum: '$click_count' },
      },
    },
  ]).exec();

  const [scheduled, failed] = await Promise.all([
    MarketingCampaignModel.countDocuments({ status: 'SCHEDULED' }),
    MarketingCampaignModel.countDocuments({ status: 'FAILED' }),
  ]);

  const recent = await MarketingCampaignModel.find({ status: 'SENT' })
    .sort({ sent_at: -1 })
    .limit(5)
    .select('campaign_id name sent_at recipient_count open_count click_count')
    .lean()
    .exec();

  const recipients = totals?.recipients ?? 0;
  return {
    sent: totals?.sent ?? 0,
    scheduled,
    failed,
    recipients,
    opens: totals?.opens ?? 0,
    clicks: totals?.clicks ?? 0,
    open_rate: rate(totals?.opens ?? 0, recipients),
    click_rate: rate(totals?.clicks ?? 0, recipients),
    recent: recent.map((campaign) => ({
      campaign_id: campaign.campaign_id,
      name: campaign.name,
      sent_at: campaign.sent_at ? campaign.sent_at.toISOString() : null,
      recipient_count: campaign.recipient_count,
      open_count: campaign.open_count,
      click_count: campaign.click_count,
      open_rate: rate(campaign.open_count, campaign.recipient_count),
    })),
  };
}

export const marketingDashboardService = {
  /**
   * Everything the Marketing console opens on, in one round trip.
   *
   * Windowed to `days` for the activity figures (clicks, campaigns sent) and
   * unwindowed for the standing ones (active links, pending ads) — "how many
   * links are live" is not a question about the last 30 days.
   */
  async overview(days = 30, now = new Date()) {
    const since = new Date(now.getTime() - days * DAY_MS);

    const [links, campaigns, top, activeLinks, totalLinks, lists, liveAds, pendingAds] =
      await Promise.all([
        linkSection(since),
        campaignSection(since),
        topLinks(since),
        ShortLinkModel.countDocuments({ is_active: true }),
        ShortLinkModel.countDocuments({}),
        // Saved lists store CRITERIA, not a member count — their reach is
        // recomputed per list on read, so summing it here would mean one
        // audience query per list on every dashboard load. The count is the
        // honest cheap number; reach lives on the Target Audience page.
        AudienceListModel.countDocuments({}),
        AdRequestModel.countDocuments({
          status: 'APPROVED',
          start_at: { $lte: now },
          end_at: { $gt: now },
        }),
        AdRequestModel.countDocuments({ status: 'PENDING' }),
      ]);

    return {
      days,
      links: { ...links, active: activeLinks, total: totalLinks, top },
      campaigns,
      audience: { lists },
      ads: { live: liveAds, pending: pendingAds },
    };
  },
};
