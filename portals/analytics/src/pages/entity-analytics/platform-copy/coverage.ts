import type { PageCopy } from './types';

/** Testing > Unit Test Coverage. */
export const COVERAGE_COPY: PageCopy = {
  kpis: {
    cov_overall: { title: 'analytics.kpi.covOverall', hint: 'analytics.kpi.covOverallHint' },
    cov_lines: { title: 'analytics.kpi.covLines', hint: 'analytics.kpi.covLinesHint' },
    cov_branches: { title: 'analytics.kpi.covBranches', hint: 'analytics.kpi.covBranchesHint' },
    cov_new_code: { title: 'analytics.kpi.covNewCode', hint: 'analytics.kpi.covNewCodeHint' },
    cov_uncovered_lines: { title: 'analytics.kpi.covUncoveredLines', hint: 'analytics.kpi.covUncoveredLinesHint' },
    cov_uncovered_conditions: {
      title: 'analytics.kpi.covUncoveredConditions',
      hint: 'analytics.kpi.covUncoveredConditionsHint',
    },
    cov_lines_to_cover: { title: 'analytics.kpi.covLinesToCover', hint: 'analytics.kpi.covLinesToCoverHint' },
    cov_full_workspaces: { title: 'analytics.kpi.covFullWorkspaces', hint: 'analytics.kpi.covFullWorkspacesHint' },
  },
  trends: {
    cov_trend: { title: 'analytics.trend.covTrend', hint: 'analytics.trend.covTrendHint' },
    cov_uncovered: { title: 'analytics.trend.covUncovered', hint: 'analytics.trend.covUncoveredHint' },
  },
  series: {},
  breakdowns: {
    cov_by_area: 'analytics.breakdown.covByArea',
    cov_bands: 'analytics.breakdown.covBands',
    cov_uncovered_by_area: 'analytics.breakdown.covUncoveredByArea',
  },
  slices: {
    cov_bands: {
      cov_0_49: 'analytics.slice.cov0To49',
      cov_50_79: 'analytics.slice.cov50To79',
      cov_80_99: 'analytics.slice.cov80To99',
      cov_100: 'analytics.slice.cov100',
    },
  },
  leaderboards: {
    cov_workspaces: {
      title: 'analytics.leaderboard.covWorkspaces',
      hint: 'analytics.leaderboard.covWorkspacesHint',
      name: 'analytics.leaderboard.workspace',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    coverage: 'analytics.leaderboard.coverage',
    line_coverage: 'analytics.leaderboard.lineCoverage',
    branch_coverage: 'analytics.leaderboard.branchCoverage',
    uncovered_lines: 'analytics.leaderboard.uncoveredLines',
    lines_to_cover: 'analytics.leaderboard.linesToCover',
  },
};
