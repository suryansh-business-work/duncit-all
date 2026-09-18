import type { PageCopy } from './types';

/** Tech > Server. */
export const SERVER_COPY: PageCopy = {
  kpis: {
    srv_cpu_avg: { title: 'analytics.kpi.srvCpuAvg', hint: 'analytics.kpi.srvCpuAvgHint' },
    srv_cpu_peak: { title: 'analytics.kpi.srvCpuPeak', hint: 'analytics.kpi.srvCpuPeakHint' },
    srv_memory_avg: { title: 'analytics.kpi.srvMemoryAvg', hint: 'analytics.kpi.srvMemoryAvgHint' },
    srv_disk_used: { title: 'analytics.kpi.srvDiskUsed', hint: 'analytics.kpi.srvDiskUsedHint' },
    srv_event_loop_p99: { title: 'analytics.kpi.srvEventLoopP99', hint: 'analytics.kpi.srvEventLoopP99Hint' },
    srv_api_p95: { title: 'analytics.kpi.srvApiP95', hint: 'analytics.kpi.srvApiP95Hint' },
    srv_errors_5xx: { title: 'analytics.kpi.srvErrors5xx', hint: 'analytics.kpi.srvErrors5xxHint' },
    srv_uptime: { title: 'analytics.kpi.srvUptime', hint: 'analytics.kpi.srvUptimeHint' },
    srv_probe_failures: { title: 'analytics.kpi.srvProbeFailures', hint: 'analytics.kpi.srvProbeFailuresHint' },
    srv_error_logs: { title: 'analytics.kpi.srvErrorLogs', hint: 'analytics.kpi.srvErrorLogsHint' },
    srv_warn_logs: { title: 'analytics.kpi.srvWarnLogs', hint: 'analytics.kpi.srvWarnLogsHint' },
    srv_status_reports: { title: 'analytics.kpi.srvStatusReports', hint: 'analytics.kpi.srvStatusReportsHint' },
  },
  trends: {
    srv_resources: { title: 'analytics.trend.srvResources', hint: 'analytics.trend.srvResourcesHint' },
    srv_latency: { title: 'analytics.trend.srvLatency', hint: 'analytics.trend.srvLatencyHint' },
    srv_errors: { title: 'analytics.trend.srvErrors', hint: 'analytics.trend.srvErrorsHint' },
  },
  series: {
    srv_api_avg: 'analytics.series.srvApiAvg',
  },
  breakdowns: {
    srv_error_sources: 'analytics.breakdown.srvErrorSources',
    srv_probe_failures_by_service: 'analytics.breakdown.srvProbeFailuresByService',
    srv_reports_by_impact: 'analytics.breakdown.srvReportsByImpact',
    srv_reports_by_status: 'analytics.breakdown.srvReportsByStatus',
  },
  slices: {
    srv_reports_by_impact: {
      CANNOT_ACCESS: 'analytics.slice.srvImpactCannotAccess',
      ERRORS: 'analytics.slice.srvImpactErrors',
      SLOW: 'analytics.slice.srvImpactSlow',
      LOGIN: 'analytics.slice.srvImpactLogin',
      PAYMENT: 'analytics.slice.srvImpactPayment',
      OTHER: 'analytics.slice.srvImpactOther',
    },
    srv_reports_by_status: {
      NEW: 'analytics.slice.srvReportNew',
      IN_PROGRESS: 'analytics.slice.srvReportInProgress',
      RESOLVED: 'analytics.slice.srvReportResolved',
      CLOSED: 'analytics.slice.srvReportClosed',
    },
  },
  leaderboards: {
    srv_containers: {
      title: 'analytics.leaderboard.srvContainers',
      hint: 'analytics.leaderboard.srvContainersHint',
      name: 'analytics.leaderboard.srvContainer',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    srv_container_cpu_avg: 'analytics.leaderboard.srvContainerCpuAvg',
    srv_container_cpu_peak: 'analytics.leaderboard.srvContainerCpuPeak',
    srv_container_memory_avg: 'analytics.leaderboard.srvContainerMemoryAvg',
    srv_container_memory_peak: 'analytics.leaderboard.srvContainerMemoryPeak',
  },
};
