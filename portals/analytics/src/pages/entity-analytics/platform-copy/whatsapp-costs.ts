import type { PageCopy } from './types';

/** Costing > WhatsApp. */
export const WHATSAPP_COSTS_COPY: PageCopy = {
  kpis: {
    wa_cost_spend: { title: 'analytics.kpi.waCostSpend', hint: 'analytics.kpi.waCostSpendHint' },
    wa_cost_per_day: { title: 'analytics.kpi.waCostPerDay', hint: 'analytics.kpi.waCostPerDayHint' },
    wa_cost_messages: { title: 'analytics.kpi.waCostMessages', hint: 'analytics.kpi.waCostMessagesHint' },
    wa_cost_per_100: { title: 'analytics.kpi.waCostPer100', hint: 'analytics.kpi.waCostPer100Hint' },
    wa_cost_automatic_spend: {
      title: 'analytics.kpi.waCostAutomaticSpend',
      hint: 'analytics.kpi.waCostAutomaticSpendHint',
    },
    wa_cost_campaign_spend: { title: 'analytics.kpi.waCostCampaignSpend', hint: 'analytics.kpi.waCostCampaignSpendHint' },
    wa_cost_campaigns: { title: 'analytics.kpi.waCostCampaigns', hint: 'analytics.kpi.waCostCampaignsHint' },
    wa_cost_zero_rate: { title: 'analytics.kpi.waCostZeroRate', hint: 'analytics.kpi.waCostZeroRateHint' },
  },
  trends: {
    wa_cost_spend: { title: 'analytics.trend.waCostSpend', hint: 'analytics.trend.waCostSpendHint' },
    wa_cost_messages: { title: 'analytics.trend.waCostMessages', hint: 'analytics.trend.waCostMessagesHint' },
  },
  series: {
    wa_cost_automatic_messages: 'analytics.series.waCostAutomaticMessages',
    wa_cost_campaign_messages: 'analytics.series.waCostCampaignMessages',
  },
  breakdowns: {
    wa_cost_by_category: 'analytics.breakdown.waCostByCategory',
    wa_cost_messages_by_category: 'analytics.breakdown.waCostMessagesByCategory',
    wa_cost_by_source: 'analytics.breakdown.waCostBySource',
    wa_cost_messages_by_source: 'analytics.breakdown.waCostMessagesBySource',
  },
  slices: {
    wa_cost_by_category: {
      MARKETING: 'analytics.slice.comWaMarketing',
      UTILITY: 'analytics.slice.comWaUtility',
      AUTHENTICATION: 'analytics.slice.comWaAuthentication',
      SERVICE: 'analytics.slice.comWaService',
    },
    wa_cost_messages_by_category: {
      MARKETING: 'analytics.slice.comWaMarketing',
      UTILITY: 'analytics.slice.comWaUtility',
      AUTHENTICATION: 'analytics.slice.comWaAuthentication',
      SERVICE: 'analytics.slice.comWaService',
    },
    wa_cost_by_source: {
      AUTOMATIC: 'analytics.slice.waCostAutomatic',
      CAMPAIGNS: 'analytics.slice.waCostCampaigns',
      OTP: 'analytics.slice.waCostOtp',
      TESTS: 'analytics.slice.waCostTests',
    },
    wa_cost_messages_by_source: {
      AUTOMATIC: 'analytics.slice.waCostAutomatic',
      CAMPAIGNS: 'analytics.slice.waCostCampaigns',
      OTP: 'analytics.slice.waCostOtp',
      TESTS: 'analytics.slice.waCostTests',
    },
  },
  leaderboards: {
    wa_cost_items: {
      title: 'analytics.leaderboard.waCostItems',
      hint: 'analytics.leaderboard.waCostItemsHint',
      name: 'analytics.leaderboard.waCostItem',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    cost_messages: 'analytics.leaderboard.costMessages',
    cost_spend: 'analytics.leaderboard.costSpend',
    cost_share: 'analytics.leaderboard.costShare',
  },
};
