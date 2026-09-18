import type { PageCopy } from './types';

/** Testing > E2E Tests. */
export const E2E_COPY: PageCopy = {
  kpis: {
    e2e_runs: { title: 'analytics.kpi.e2eRuns', hint: 'analytics.kpi.e2eRunsHint' },
    e2e_run_pass_rate: { title: 'analytics.kpi.e2eRunPassRate', hint: 'analytics.kpi.e2eRunPassRateHint' },
    e2e_tests: { title: 'analytics.kpi.e2eTests', hint: 'analytics.kpi.e2eTestsHint' },
    e2e_test_pass_rate: { title: 'analytics.kpi.e2eTestPassRate', hint: 'analytics.kpi.e2eTestPassRateHint' },
    e2e_failed_tests: { title: 'analytics.kpi.e2eFailedTests', hint: 'analytics.kpi.e2eFailedTestsHint' },
    e2e_skipped_tests: { title: 'analytics.kpi.e2eSkippedTests', hint: 'analytics.kpi.e2eSkippedTestsHint' },
    e2e_avg_duration: { title: 'analytics.kpi.e2eAvgDuration', hint: 'analytics.kpi.e2eAvgDurationHint' },
    e2e_suites_failed: { title: 'analytics.kpi.e2eSuitesFailed', hint: 'analytics.kpi.e2eSuitesFailedHint' },
  },
  trends: {
    e2e_runs: { title: 'analytics.trend.e2eRuns', hint: 'analytics.trend.e2eRunsHint' },
    e2e_test_results: { title: 'analytics.trend.e2eTestResults', hint: 'analytics.trend.e2eTestResultsHint' },
    e2e_duration: { title: 'analytics.trend.e2eDuration', hint: 'analytics.trend.e2eDurationHint' },
  },
  series: {
    e2e_runs_passed: 'analytics.series.passed',
    e2e_runs_failed: 'analytics.series.failed',
    e2e_tests_passed: 'analytics.series.passed',
    e2e_failed_tests: 'analytics.series.failed',
    e2e_skipped_tests: 'analytics.series.skipped',
  },
  breakdowns: {
    e2e_status: 'analytics.breakdown.e2eStatus',
    e2e_trigger: 'analytics.breakdown.e2eTrigger',
    e2e_branch: 'analytics.breakdown.e2eBranch',
    e2e_suite_failures: 'analytics.breakdown.e2eSuiteFailures',
  },
  slices: {
    e2e_status: {
      SUCCESS: 'analytics.slice.runPassed',
      FAILED: 'analytics.slice.runFailed',
      RUNNING: 'analytics.slice.runRunning',
      QUEUED: 'analytics.slice.runQueued',
    },
    e2e_trigger: {
      SCHEDULE: 'analytics.slice.triggerSchedule',
      PORTAL: 'analytics.slice.triggerPortal',
      MANUAL: 'analytics.slice.triggerManual',
    },
  },
  leaderboards: {
    e2e_suites: {
      title: 'analytics.leaderboard.e2eSuites',
      hint: 'analytics.leaderboard.e2eSuitesHint',
      name: 'analytics.leaderboard.suite',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    runs: 'analytics.leaderboard.runs',
    pass_rate: 'analytics.leaderboard.passRate',
    tests: 'analytics.leaderboard.tests',
    failed_tests: 'analytics.leaderboard.failedTests',
    avg_duration: 'analytics.leaderboard.avgDuration',
  },
};
