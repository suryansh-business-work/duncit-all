import type { PageCopy } from './types';

/** Costing > OpenAI. Spend, share and cost columns are shared with Costing > WhatsApp. */
export const OPENAI_COSTS_COPY: PageCopy = {
  kpis: {
    oai_cost_spend: { title: 'analytics.kpi.oaiCostSpend', hint: 'analytics.kpi.oaiCostSpendHint' },
    oai_cost_per_day: { title: 'analytics.kpi.oaiCostPerDay', hint: 'analytics.kpi.oaiCostPerDayHint' },
    oai_cost_requests: { title: 'analytics.kpi.oaiCostRequests', hint: 'analytics.kpi.oaiCostRequestsHint' },
    oai_cost_per_1k_requests: {
      title: 'analytics.kpi.oaiCostPer1kRequests',
      hint: 'analytics.kpi.oaiCostPer1kRequestsHint',
    },
    oai_cost_tokens: { title: 'analytics.kpi.oaiCostTokens', hint: 'analytics.kpi.oaiCostTokensHint' },
    oai_cost_per_1m_tokens: { title: 'analytics.kpi.oaiCostPer1mTokens', hint: 'analytics.kpi.oaiCostPer1mTokensHint' },
    oai_cost_unpriced: { title: 'analytics.kpi.oaiCostUnpriced', hint: 'analytics.kpi.oaiCostUnpricedHint' },
  },
  trends: {
    oai_cost_spend: { title: 'analytics.trend.oaiCostSpend', hint: 'analytics.trend.oaiCostSpendHint' },
    oai_cost_tokens: { title: 'analytics.trend.oaiCostTokens', hint: 'analytics.trend.oaiCostTokensHint' },
  },
  series: {},
  breakdowns: {
    oai_cost_by_model: 'analytics.breakdown.oaiCostByModel',
    oai_cost_by_module: 'analytics.breakdown.oaiCostByModule',
  },
  slices: {},
  leaderboards: {
    oai_cost_tasks: {
      title: 'analytics.leaderboard.oaiCostTasks',
      hint: 'analytics.leaderboard.oaiCostTasksHint',
      name: 'analytics.leaderboard.oaiCostTask',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    cost_requests: 'analytics.leaderboard.costRequests',
    cost_tokens: 'analytics.leaderboard.costTokens',
  },
};
