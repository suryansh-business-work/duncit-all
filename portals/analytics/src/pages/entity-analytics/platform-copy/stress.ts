import type { PageCopy } from './types';

/** Testing > Stress Testing. */
export const STRESS_COPY: PageCopy = {
  kpis: {
    stress_runs: { title: 'analytics.kpi.stressRuns', hint: 'analytics.kpi.stressRunsHint' },
    stress_completion_rate: { title: 'analytics.kpi.stressCompletionRate', hint: 'analytics.kpi.stressCompletionRateHint' },
    stress_peak_users: { title: 'analytics.kpi.stressPeakUsers', hint: 'analytics.kpi.stressPeakUsersHint' },
    stress_peak_rps: { title: 'analytics.kpi.stressPeakRps', hint: 'analytics.kpi.stressPeakRpsHint' },
    stress_p95: { title: 'analytics.kpi.stressP95', hint: 'analytics.kpi.stressP95Hint' },
    stress_error_rate: { title: 'analytics.kpi.stressErrorRate', hint: 'analytics.kpi.stressErrorRateHint' },
    stress_requests: { title: 'analytics.kpi.stressRequests', hint: 'analytics.kpi.stressRequestsHint' },
    stress_safe_users: { title: 'analytics.kpi.stressSafeUsers', hint: 'analytics.kpi.stressSafeUsersHint' },
  },
  trends: {
    stress_runs: { title: 'analytics.trend.stressRuns', hint: 'analytics.trend.stressRunsHint' },
    stress_latency: { title: 'analytics.trend.stressLatency', hint: 'analytics.trend.stressLatencyHint' },
    stress_load: { title: 'analytics.trend.stressLoad', hint: 'analytics.trend.stressLoadHint' },
  },
  series: {
    stress_completed: 'analytics.series.completed',
    stress_aborted: 'analytics.series.aborted',
    stress_failed: 'analytics.series.failed',
    stress_p50: 'analytics.series.p50',
    stress_p95: 'analytics.series.p95',
    stress_p99: 'analytics.series.p99',
  },
  breakdowns: {
    stress_status: 'analytics.breakdown.stressStatus',
    stress_verdict: 'analytics.breakdown.stressVerdict',
    stress_scale: 'analytics.breakdown.stressScale',
  },
  slices: {
    stress_status: {
      COMPLETED: 'analytics.slice.runCompleted',
      ABORTED: 'analytics.slice.runAborted',
      FAILED: 'analytics.slice.runFailed',
      LIVE: 'analytics.slice.runLive',
    },
    stress_verdict: {
      HEALTHY: 'analytics.slice.verdictHealthy',
      STRAINED: 'analytics.slice.verdictStrained',
      OVERLOADED: 'analytics.slice.verdictOverloaded',
      INCONCLUSIVE: 'analytics.slice.verdictInconclusive',
      NONE: 'analytics.slice.verdictNone',
    },
    stress_scale: {
      scale_1_50: 'analytics.slice.scale1To50',
      scale_51_200: 'analytics.slice.scale51To200',
      scale_201_500: 'analytics.slice.scale201To500',
      scale_501_plus: 'analytics.slice.scale501Plus',
    },
  },
  leaderboards: {
    stress_endpoints: {
      title: 'analytics.leaderboard.stressEndpoints',
      hint: 'analytics.leaderboard.stressEndpointsHint',
      name: 'analytics.leaderboard.endpoint',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    requests: 'analytics.leaderboard.requests',
    error_rate: 'analytics.leaderboard.errorRate',
    p95: 'analytics.leaderboard.p95',
    p99: 'analytics.leaderboard.p99',
  },
};
