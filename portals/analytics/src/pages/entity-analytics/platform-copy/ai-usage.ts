import type { PageCopy } from './types';

/** Tech > AI usage. */
export const AI_USAGE_COPY: PageCopy = {
  kpis: {
    ai_requests: { title: 'analytics.kpi.aiRequests', hint: 'analytics.kpi.aiRequestsHint' },
    ai_input_tokens: { title: 'analytics.kpi.aiInputTokens', hint: 'analytics.kpi.aiInputTokensHint' },
    ai_output_tokens: { title: 'analytics.kpi.aiOutputTokens', hint: 'analytics.kpi.aiOutputTokensHint' },
    ai_cost: { title: 'analytics.kpi.aiCost', hint: 'analytics.kpi.aiCostHint' },
    ai_failed: { title: 'analytics.kpi.aiFailed', hint: 'analytics.kpi.aiFailedHint' },
    ai_failure_rate: { title: 'analytics.kpi.aiFailureRate', hint: 'analytics.kpi.aiFailureRateHint' },
    ai_latency: { title: 'analytics.kpi.aiLatency', hint: 'analytics.kpi.aiLatencyHint' },
    ai_images_scanned: { title: 'analytics.kpi.aiImagesScanned', hint: 'analytics.kpi.aiImagesScannedHint' },
    ai_images_flagged: { title: 'analytics.kpi.aiImagesFlagged', hint: 'analytics.kpi.aiImagesFlaggedHint' },
    ai_ask_bot_answers: { title: 'analytics.kpi.aiAskBotAnswers', hint: 'analytics.kpi.aiAskBotAnswersHint' },
    ai_agent_turns: { title: 'analytics.kpi.aiAgentTurns', hint: 'analytics.kpi.aiAgentTurnsHint' },
  },
  trends: {
    ai_requests: { title: 'analytics.trend.aiRequests', hint: 'analytics.trend.aiRequestsHint' },
    ai_tokens: { title: 'analytics.trend.aiTokens', hint: 'analytics.trend.aiTokensHint' },
    ai_cost: { title: 'analytics.trend.aiCost', hint: 'analytics.trend.aiCostHint' },
  },
  series: {
    ai_answered: 'analytics.series.aiAnswered',
  },
  breakdowns: {
    ai_cost_by_module: 'analytics.breakdown.aiCostByModule',
    ai_cost_by_model: 'analytics.breakdown.aiCostByModel',
    ai_request_status: 'analytics.breakdown.aiRequestStatus',
    ai_scan_risk: 'analytics.breakdown.aiScanRisk',
    ai_scan_action: 'analytics.breakdown.aiScanAction',
    ai_scans_by_surface: 'analytics.breakdown.aiScansBySurface',
  },
  slices: {
    ai_request_status: {
      SUCCESS: 'analytics.slice.aiSuccess',
      FAILED: 'analytics.slice.aiFailed',
      SKIPPED: 'analytics.slice.aiSkipped',
    },
    ai_scan_risk: {
      PENDING: 'analytics.slice.aiPending',
      LOW: 'analytics.slice.aiLow',
      MEDIUM: 'analytics.slice.aiMedium',
      HIGH: 'analytics.slice.aiHigh',
    },
    ai_scan_action: {
      NONE: 'analytics.slice.aiNone',
      ALLOWED: 'analytics.slice.aiAllowed',
      FLAGGED: 'analytics.slice.aiFlagged',
      BLOCKED: 'analytics.slice.aiBlocked',
    },
  },
  leaderboards: {
    ai_tasks: {
      title: 'analytics.leaderboard.aiTasks',
      hint: 'analytics.leaderboard.aiTasksHint',
      name: 'analytics.leaderboard.aiTask',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    ai_task_requests: 'analytics.leaderboard.aiTaskRequests',
    ai_task_tokens: 'analytics.leaderboard.aiTaskTokens',
    ai_task_cost: 'analytics.leaderboard.aiTaskCost',
    ai_task_failure_rate: 'analytics.leaderboard.aiTaskFailureRate',
    ai_task_latency: 'analytics.leaderboard.aiTaskLatency',
  },
};
