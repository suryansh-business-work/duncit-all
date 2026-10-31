import { ShortLinkClickModel } from '../shortLinkClick.model';
import { SocialPostModel } from '../social/social.model';
import type { MarketingLeadPipeline } from '../leads/marketingLead.types';
import { accountsIn, engagementRate, followerGrowth, totalsByNetwork, socialAnalytics } from './marketingAnalytics.social';
import { contentAnalytics, postCounts, reelFigures } from './marketingAnalytics.content';
import { funnelAnalytics } from './marketingAnalytics.funnel';
import { automationAnalytics, runTotals } from './marketingAnalytics.automation';
import { dayOf, inWindow, percent, seriesOf, windowOf, type AnalyticsWindow, type MarketingAnalyticsInput } from './marketingAnalytics.window';

/**
 * What the short links earned in the window: clicks, the ones a payment was
 * attributed to, and that revenue (in rupees, as the links page shows it).
 * Networks do not apply — a link click's "platform" is where it was tapped.
 */
async function linkFigures(window: AnalyticsWindow) {
  const match = { clicked_at: inWindow(window) };
  const [[totals], daily] = await Promise.all([
    ShortLinkClickModel.aggregate<{ clicks: number; conversions: number; revenue: number }>([
      { $match: match },
      {
        $group: {
          _id: null,
          clicks: { $sum: 1 },
          conversions: { $sum: { $cond: [{ $gt: ['$converted_amount', 0] }, 1, 0] } },
          revenue: { $sum: { $ifNull: ['$converted_amount', 0] } },
        },
      },
    ]),
    ShortLinkClickModel.aggregate<{ _id: string; value: number }>([
      { $match: match },
      { $group: { _id: dayOf(window, '$clicked_at'), value: { $sum: 1 } } },
    ]),
  ]);
  const clicks = totals?.clicks ?? 0;
  const conversions = totals?.conversions ?? 0;
  return {
    clicks,
    conversions,
    conversion_rate: percent(conversions, clicks),
    revenue: totals?.revenue ?? 0,
    daily_clicks: seriesOf(window, daily),
  };
}

/** The window's engagement per day, across the asked networks. */
const engagementByDay = async (window: AnalyticsWindow, ids: string[]) =>
  seriesOf(
    window,
    await SocialPostModel.aggregate<{ _id: string; value: number }>([
      { $match: { account_id: { $in: ids }, published_at: inWindow(window) } },
      { $group: { _id: dayOf(window, '$published_at'), value: { $sum: '$engagement' } } },
    ])
  );

/** The headline of each analytics page, and the links' revenue, for one window. */
async function overviewAnalytics(window: AnalyticsWindow) {
  const accounts = await accountsIn(window);
  const ids = accounts.map((account) => String(account._id));
  const [networks, growth, engagement, posts, reels, funnel, runs, links] = await Promise.all([
    totalsByNetwork(window, ids),
    followerGrowth(window, ids),
    engagementByDay(window, ids),
    postCounts(window),
    reelFigures(window),
    funnelAnalytics(window),
    runTotals(window),
    linkFigures(window),
  ]);
  const followers = accounts.reduce((sum, account) => sum + (account.followers ?? 0), 0);
  const networkPosts = networks.reduce((sum, row) => sum + row.posts, 0);
  const networkEngagement = networks.reduce((sum, row) => sum + row.engagement, 0);
  return {
    window: { from: window.from, to: window.to, days: window.days },
    social: {
      followers,
      follower_growth: [...growth.values()].reduce((sum, row) => sum + row.growth, 0),
      posts: networkPosts,
      views: networks.reduce((sum, row) => sum + row.views, 0),
      engagement: networkEngagement,
      engagement_rate: engagementRate(networkEngagement, networkPosts, followers),
    },
    content: { ...posts, reels_made: reels.made, reels_posted: reels.posted, reel_views: reels.views },
    funnel: { new_leads: funnel.new_leads, converted: funnel.converted, promoted: funnel.promoted },
    automation: { runs: runs.runs, success_rate: runs.success_rate, cost: runs.cost, tokens: runs.tokens },
    links: { clicks: links.clicks, conversions: links.conversions, conversion_rate: links.conversion_rate, revenue: links.revenue },
    daily: { engagement, new_leads: funnel.daily_new, clicks: links.daily_clicks },
  };
}

/** Marketing › Analytics — every page reads one window, checked once here. */
export const marketingAnalyticsService = {
  overview: (input: MarketingAnalyticsInput) => overviewAnalytics(windowOf(input)),
  social: (input: MarketingAnalyticsInput) => socialAnalytics(windowOf(input)),
  content: (input: MarketingAnalyticsInput) => contentAnalytics(windowOf(input)),
  funnel: (input: MarketingAnalyticsInput, pipeline?: MarketingLeadPipeline | null) => funnelAnalytics(windowOf(input), pipeline ?? null),
  automation: (input: MarketingAnalyticsInput) => automationAnalytics(windowOf(input)),
};
