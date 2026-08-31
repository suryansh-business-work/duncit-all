import type { MockedResponse } from '@apollo/client/testing';
import {
  MARKETING_DASHBOARD,
  type MarketingDashboard,
} from '../../src/pages/dashboard-page/queries';

export const makeMarketingDashboard = (
  over: Partial<MarketingDashboard> = {},
): MarketingDashboard => ({
  days: 30,
  links: {
    total_clicks: 1280,
    unique_visitors: 940,
    conversions: 42,
    revenue: 63000,
    conversion_rate: 3.3,
    active: 12,
    total: 15,
    daily: [
      { date: '2026-07-31', count: 400 },
      { date: '2026-08-01', count: 880 },
    ],
    platforms: [
      { label: 'Instagram', count: 900 },
      { label: 'Direct', count: 380 },
    ],
    countries: [{ label: 'IN', count: 1100 }],
    top: [
      { id: 'sl1', label: 'Diwali pod push', code: 'aB3xY9Zq', clicks: 700, revenue: 45000 },
      { id: 'sl2', label: 'Poster run', code: 'Zq7mKp2a', clicks: 300, revenue: 0 },
    ],
  },
  campaigns: {
    sent: 6,
    scheduled: 2,
    failed: 1,
    recipients: 8400,
    opens: 2100,
    clicks: 310,
    open_rate: 25,
    click_rate: 3.7,
    recent: [
      {
        campaign_id: 'camp-1',
        name: 'Badminton Launch',
        sent_at: '2026-08-01T09:00:00.000Z',
        recipient_count: 4000,
        open_count: 1200,
        click_count: 180,
        open_rate: 30,
      },
    ],
  },
  audience: { lists: 4 },
  ads: { live: 3, pending: 2 },
  ...over,
});

const typed = (board: MarketingDashboard) => ({
  __typename: 'MarketingDashboard',
  days: board.days,
  links: {
    __typename: 'MarketingDashboardLinks',
    ...board.links,
    daily: board.links.daily.map((d) => ({ __typename: 'MarketingDashboardDaily', ...d })),
    platforms: board.links.platforms.map((p) => ({ __typename: 'MarketingDashboardPoint', ...p })),
    countries: board.links.countries.map((c) => ({ __typename: 'MarketingDashboardPoint', ...c })),
    top: board.links.top.map((t) => ({ __typename: 'MarketingDashboardTopLink', ...t })),
  },
  campaigns: {
    __typename: 'MarketingDashboardCampaigns',
    ...board.campaigns,
    recent: board.campaigns.recent.map((r) => ({
      __typename: 'MarketingDashboardRecentCampaign',
      ...r,
    })),
  },
  audience: { __typename: 'MarketingDashboardAudience', ...board.audience },
  ads: { __typename: 'MarketingDashboardAds', ...board.ads },
});

export const marketingDashboardMock = (
  over: Partial<MarketingDashboard> = {},
  opts: { pending?: boolean; failWith?: string } = {},
): MockedResponse => ({
  request: { query: MARKETING_DASHBOARD, variables: () => true },
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : { result: { data: { marketingDashboard: typed(makeMarketingDashboard(over)) } } }),
  ...(opts.pending ? { delay: Infinity } : {}),
  maxUsageCount: 20,
});
