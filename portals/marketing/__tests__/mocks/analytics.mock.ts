import type { MockedResponse } from '@apollo/client/testing';
import type { DocumentNode } from 'graphql';
import {
  MARKETING_ANALYTICS_AUTOMATION,
  MARKETING_ANALYTICS_CONTENT,
  MARKETING_ANALYTICS_FUNNEL,
  MARKETING_ANALYTICS_OVERVIEW,
  MARKETING_ANALYTICS_SOCIAL,
  type AnalyticsAutomation,
  type AnalyticsContent,
  type AnalyticsFunnel,
  type AnalyticsOverview,
  type AnalyticsSocial,
} from '../../src/pages/analytics-shared/queries';

/**
 * Marketing › Analytics fixtures. Each factory returns the page's projection;
 * the `*Mock` builders wrap it with `__typename` on every object, as the
 * server's schema names them, so MockedProvider caches it like production.
 */
const DAYS = ['2026-10-01', '2026-10-02'];
const windowOf = () => ({ __typename: 'MarketingAnalyticsWindow', days: DAYS });
const typedList = <T extends object>(typename: string, rows: readonly T[]) => rows.map((row) => ({ __typename: typename, ...row }));

export const makeAnalyticsOverview = (over: Partial<AnalyticsOverview> = {}): AnalyticsOverview => ({
  window: { days: DAYS },
  social: { followers: 1200, follower_growth: 40, posts: 6, views: 9000, engagement: 640, engagement_rate: 8.89 },
  content: { from_duncit: 4, from_networks: 6, reels_made: 2, reels_posted: 1, reel_views: 3100 },
  funnel: { new_leads: 9, converted: 2, promoted: 1 },
  automation: { runs: 14, success_rate: 92.3, cost: 1.25, tokens: 48000 },
  links: { clicks: 310, conversions: 7, conversion_rate: 2.3, revenue: 21000 },
  daily: { engagement: [400, 240], new_leads: [5, 4], clicks: [200, 110] },
  ...over,
});

export const makeAnalyticsSocial = (over: Partial<AnalyticsSocial> = {}): AnalyticsSocial => ({
  window: { days: DAYS },
  followers: 1200,
  follower_growth: 40,
  posts: 6,
  views: 9000,
  engagement: 640,
  engagement_rate: 8.89,
  daily: { engagement: [400, 240], views: [6000, 3000] },
  networks: [
    { platform: 'INSTAGRAM', followers: 1000, posts: 4, views: 9000, engagement: 600, engagement_rate: 15 },
    { platform: 'MYSPACE', followers: 200, posts: 2, views: 0, engagement: 40, engagement_rate: 10 },
  ],
  accounts: [{ account_id: 'a1', name: 'Duncit IG', growth: 40 }],
  top_posts: [
    { id: 'p1', text: 'Diwali pods are live', platform: 'INSTAGRAM', account_name: 'Duncit IG', permalink: 'https://instagram.com/p/1', published_at: '2026-10-01T06:00:00.000Z', views: 5000, engagement: 400 },
    { id: 'p2', text: '', platform: 'FACEBOOK', account_name: 'Duncit FB', permalink: '', published_at: '2026-10-02T06:00:00.000Z', views: 0, engagement: 12 },
    { id: 'p3', text: '', platform: 'X', account_name: 'Duncit X', permalink: 'https://x.com/duncit/3', published_at: '2026-10-02T07:00:00.000Z', views: 0, engagement: 3 },
  ],
  ...over,
});

export const makeAnalyticsContent = (over: Partial<AnalyticsContent> = {}): AnalyticsContent => ({
  from_duncit: 4,
  from_networks: 6,
  formats: [
    { format: 'CAROUSEL', posts: 2, views: 3000, engagement: 300 },
    { format: 'VIDEO', posts: 1, views: 3100, engagement: 210 },
    { format: 'SINGLE', posts: 1, views: 0, engagement: 0 },
    { format: 'TEXT', posts: 0, views: 0, engagement: 0 },
  ],
  reels_made: 2,
  reels_posted: 2,
  reel_views: 3110,
  reel_engagement: 215,
  top_reels: [
    { id: 'r1', name: 'Diwali reel', views: 3100 },
    { id: 'r2', name: '', views: 10 },
  ],
  by_weekday: [0, 0, 0, 0, 120, 0, 40],
  by_hour: Array.from({ length: 24 }, (_unused, hour) => (hour === 18 ? 90 : 0)),
  best_weekday: 4,
  best_hour: 18,
  ...over,
});

export const makeAnalyticsFunnel = (over: Partial<AnalyticsFunnel> = {}): AnalyticsFunnel => ({
  window: { days: DAYS },
  new_leads: 9,
  by_source: [
    { key: 'INSTAGRAM', count: 6 },
    { key: 'IMPORT', count: 3 },
  ],
  daily_new: [5, 4],
  funnel: [
    { stage: 'NEW', reached: 9, conversion: 100 },
    { stage: 'CONTACTED', reached: 5, conversion: 55.6 },
  ],
  converted: 2,
  time_in_stage: [{ stage: 'NEW', moves: 5, median_hours: 10 }],
  promoted: 1,
  ...over,
});

export const makeAnalyticsAutomation = (over: Partial<AnalyticsAutomation> = {}): AnalyticsAutomation => ({
  window: { days: DAYS },
  runs: 14,
  success_rate: 92.3,
  tokens: 48000,
  cost: 1.25,
  by_workflow: [
    { workflow: 'REEL', runs: 10, cost: 1 },
    { workflow: 'CAMPAIGN', runs: 0, cost: 0 },
  ],
  by_status: [
    { key: 'COMPLETED', count: 12 },
    { key: 'RUNNING', count: 0 },
  ],
  daily: { runs: [9, 5], cost: [1, 0.25] },
  approvals: { waiting: 2, decided: 3, median_decision_minutes: 30 },
  agents: [{ agent_key: 'CONTENT_PLANNER', runs: 4, success_rate: 75 }],
  ...over,
});

const typedOverview = (o: AnalyticsOverview) => ({
  __typename: 'MarketingAnalyticsOverview',
  window: windowOf(),
  social: { __typename: 'MarketingAnalyticsOverviewSocial', ...o.social },
  content: { __typename: 'MarketingAnalyticsOverviewContent', ...o.content },
  funnel: { __typename: 'MarketingAnalyticsOverviewFunnel', ...o.funnel },
  automation: { __typename: 'MarketingAnalyticsOverviewAutomation', ...o.automation },
  links: { __typename: 'MarketingAnalyticsOverviewLinks', ...o.links },
  daily: { __typename: 'MarketingAnalyticsOverviewDaily', ...o.daily },
});

const typedSocial = (s: AnalyticsSocial) => ({
  __typename: 'MarketingAnalyticsSocial',
  ...s,
  window: windowOf(),
  daily: { __typename: 'MarketingAnalyticsSocialDaily', ...s.daily },
  networks: typedList('MarketingAnalyticsNetwork', s.networks),
  accounts: typedList('MarketingAnalyticsAccountGrowth', s.accounts),
  top_posts: typedList('MarketingAnalyticsTopPost', s.top_posts),
});

const typedContent = (c: AnalyticsContent) => ({
  __typename: 'MarketingAnalyticsContent',
  ...c,
  formats: typedList('MarketingAnalyticsFormat', c.formats),
  top_reels: typedList('MarketingAnalyticsReel', c.top_reels),
});

const typedFunnel = (f: AnalyticsFunnel) => ({
  __typename: 'MarketingAnalyticsFunnel',
  ...f,
  window: windowOf(),
  by_source: typedList('MarketingAnalyticsCount', f.by_source),
  funnel: typedList('MarketingAnalyticsFunnelStep', f.funnel),
  time_in_stage: typedList('MarketingAnalyticsStageTime', f.time_in_stage),
});

const typedAutomation = (a: AnalyticsAutomation) => ({
  __typename: 'MarketingAnalyticsAutomation',
  ...a,
  window: windowOf(),
  by_workflow: typedList('MarketingAnalyticsWorkflow', a.by_workflow),
  by_status: typedList('MarketingAnalyticsCount', a.by_status),
  daily: { __typename: 'MarketingAnalyticsRunDaily', ...a.daily },
  approvals: { __typename: 'MarketingAnalyticsApprovals', ...a.approvals },
  agents: typedList('MarketingAnalyticsAgent', a.agents),
});

interface MockOptions {
  failWith?: string;
  /** Asserts on the variables the page sent; any variables match by default. */
  variables?: (vars: Record<string, unknown>) => boolean;
}

const analyticsMock = (query: DocumentNode, field: string, data: object, opts: MockOptions): MockedResponse => ({
  request: { query, variables: opts.variables ?? (() => true) },
  result: opts.failWith ? { errors: [{ message: opts.failWith }] } : { data: { [field]: data } },
  maxUsageCount: 20,
});

export const analyticsOverviewMock = (over: Partial<AnalyticsOverview> = {}, opts: MockOptions = {}) =>
  analyticsMock(MARKETING_ANALYTICS_OVERVIEW, 'marketingAnalyticsOverview', typedOverview(makeAnalyticsOverview(over)), opts);
export const analyticsSocialMock = (over: Partial<AnalyticsSocial> = {}, opts: MockOptions = {}) =>
  analyticsMock(MARKETING_ANALYTICS_SOCIAL, 'marketingAnalyticsSocial', typedSocial(makeAnalyticsSocial(over)), opts);
export const analyticsContentMock = (over: Partial<AnalyticsContent> = {}, opts: MockOptions = {}) =>
  analyticsMock(MARKETING_ANALYTICS_CONTENT, 'marketingAnalyticsContent', typedContent(makeAnalyticsContent(over)), opts);
export const analyticsFunnelMock = (over: Partial<AnalyticsFunnel> = {}, opts: MockOptions = {}) =>
  analyticsMock(MARKETING_ANALYTICS_FUNNEL, 'marketingAnalyticsFunnel', typedFunnel(makeAnalyticsFunnel(over)), opts);
export const analyticsAutomationMock = (over: Partial<AnalyticsAutomation> = {}, opts: MockOptions = {}) =>
  analyticsMock(MARKETING_ANALYTICS_AUTOMATION, 'marketingAnalyticsAutomation', typedAutomation(makeAnalyticsAutomation(over)), opts);
