import type { PageCopy } from './types';

/** Tech > API performance. */
export const API_PERFORMANCE_COPY: PageCopy = {
  kpis: {
    api_requests: { title: 'analytics.kpi.apiRequests', hint: 'analytics.kpi.apiRequestsHint' },
    api_failed_requests: { title: 'analytics.kpi.apiFailedRequests', hint: 'analytics.kpi.apiFailedRequestsHint' },
    api_error_rate: { title: 'analytics.kpi.apiErrorRate', hint: 'analytics.kpi.apiErrorRateHint' },
    api_p50: { title: 'analytics.kpi.apiP50', hint: 'analytics.kpi.apiP50Hint' },
    api_p95: { title: 'analytics.kpi.apiP95', hint: 'analytics.kpi.apiP95Hint' },
    api_p99: { title: 'analytics.kpi.apiP99', hint: 'analytics.kpi.apiP99Hint' },
    api_cache_rate: { title: 'analytics.kpi.apiCacheRate', hint: 'analytics.kpi.apiCacheRateHint' },
    api_operations: { title: 'analytics.kpi.apiOperations', hint: 'analytics.kpi.apiOperationsHint' },
    api_rate_limit_blocks: { title: 'analytics.kpi.apiRateLimitBlocks', hint: 'analytics.kpi.apiRateLimitBlocksHint' },
    api_monitored_breaches: {
      title: 'analytics.kpi.apiMonitoredBreaches',
      hint: 'analytics.kpi.apiMonitoredBreachesHint',
    },
  },
  trends: {
    api_traffic: { title: 'analytics.trend.apiTraffic', hint: 'analytics.trend.apiTrafficHint' },
    api_latency: { title: 'analytics.trend.apiLatency', hint: 'analytics.trend.apiLatencyHint' },
    api_rate_limiting: { title: 'analytics.trend.apiRateLimiting', hint: 'analytics.trend.apiRateLimitingHint' },
  },
  series: {},
  breakdowns: {
    api_busiest_operations: 'analytics.breakdown.apiBusiestOperations',
    api_latency_bands: 'analytics.breakdown.apiLatencyBands',
    api_errors_by_code: 'analytics.breakdown.apiErrorsByCode',
    api_requests_by_client: 'analytics.breakdown.apiRequestsByClient',
    api_top_blocked_callers: 'analytics.breakdown.apiTopBlockedCallers',
  },
  slices: {
    api_latency_bands: {
      lat_under_100: 'analytics.slice.apiLatUnder100',
      lat_100_300: 'analytics.slice.apiLat100To300',
      lat_300_1000: 'analytics.slice.apiLat300To1000',
      lat_1000_3000: 'analytics.slice.apiLat1000To3000',
      lat_over_3000: 'analytics.slice.apiLatOver3000',
    },
  },
  leaderboards: {
    api_slowest_operations: {
      title: 'analytics.leaderboard.apiSlowestOperations',
      hint: 'analytics.leaderboard.apiSlowestOperationsHint',
      name: 'analytics.leaderboard.apiOperation',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    api_requests: 'analytics.leaderboard.apiRequests',
    api_error_rate: 'analytics.leaderboard.apiErrorRate',
    api_p50: 'analytics.leaderboard.apiP50',
    api_p95: 'analytics.leaderboard.apiP95',
    api_p99: 'analytics.leaderboard.apiP99',
  },
};
