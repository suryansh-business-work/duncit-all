import type { useTranslation } from '@duncit/app-settings';
import type { Kpi } from './AnalyticsLayout';

type Translate = ReturnType<typeof useTranslation>['t'];

/** Every headline tile's label and the hint that says what it counts. */
const KPI_COPY = {
  followers: ['marketing.analytics.kpi.followers', 'marketing.analytics.kpi.followersHint'],
  followerGrowth: ['marketing.analytics.kpi.followerGrowth', 'marketing.analytics.kpi.followerGrowthHint'],
  posts: ['marketing.analytics.kpi.posts', 'marketing.analytics.kpi.postsHint'],
  views: ['marketing.analytics.kpi.views', 'marketing.analytics.kpi.viewsHint'],
  engagement: ['marketing.analytics.kpi.engagement', 'marketing.analytics.kpi.engagementHint'],
  engagementRate: ['marketing.analytics.kpi.engagementRate', 'marketing.analytics.kpi.engagementRateHint'],
  fromDuncit: ['marketing.analytics.kpi.fromDuncit', 'marketing.analytics.kpi.fromDuncitHint'],
  fromNetworks: ['marketing.analytics.kpi.fromNetworks', 'marketing.analytics.kpi.fromNetworksHint'],
  reelsMade: ['marketing.analytics.kpi.reelsMade', 'marketing.analytics.kpi.reelsMadeHint'],
  reelsPosted: ['marketing.analytics.kpi.reelsPosted', 'marketing.analytics.kpi.reelsPostedHint'],
  reelViews: ['marketing.analytics.kpi.reelViews', 'marketing.analytics.kpi.reelViewsHint'],
  newLeads: ['marketing.analytics.kpi.newLeads', 'marketing.analytics.kpi.newLeadsHint'],
  converted: ['marketing.analytics.kpi.converted', 'marketing.analytics.kpi.convertedHint'],
  promoted: ['marketing.analytics.kpi.promoted', 'marketing.analytics.kpi.promotedHint'],
  runs: ['marketing.analytics.kpi.runs', 'marketing.analytics.kpi.runsHint'],
  successRate: ['marketing.analytics.kpi.successRate', 'marketing.analytics.kpi.successRateHint'],
  aiCost: ['marketing.analytics.kpi.aiCost', 'marketing.analytics.kpi.aiCostHint'],
  tokens: ['marketing.analytics.kpi.tokens', 'marketing.analytics.kpi.tokensHint'],
  approvalsWaiting: ['marketing.analytics.kpi.approvalsWaiting', 'marketing.analytics.kpi.approvalsWaitingHint'],
  decisionTime: ['marketing.analytics.kpi.decisionTime', 'marketing.analytics.kpi.decisionTimeHint'],
  clicks: ['marketing.analytics.kpi.clicks', 'marketing.analytics.kpi.clicksHint'],
  conversions: ['marketing.analytics.kpi.conversions', 'marketing.analytics.kpi.conversionsHint'],
  revenue: ['marketing.analytics.kpi.revenue', 'marketing.analytics.kpi.revenueHint'],
} as const;

export type KpiKey = keyof typeof KPI_COPY;

/** One headline tile, its copy read from the catalogue. */
export const kpi = (t: Translate, key: KpiKey, value: string): Kpi => ({
  key,
  label: t(KPI_COPY[key][0]),
  value,
  hint: t(KPI_COPY[key][1]),
});

/** A tile's label alone — a chart series named after the same figure. */
export const kpiLabel = (t: Translate, key: KpiKey) => t(KPI_COPY[key][0]);

/** The steps every analytics page's intro walks through. */
export const introSteps = (t: Translate) => [
  t('marketing.analytics.stepWindow'),
  t('marketing.analytics.stepRead'),
  t('marketing.analytics.stepHelp'),
];
