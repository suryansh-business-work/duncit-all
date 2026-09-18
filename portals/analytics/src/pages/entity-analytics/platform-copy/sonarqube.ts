import type { PageCopy } from './types';

/** Security > SonarQube. */
export const SONARQUBE_COPY: PageCopy = {
  kpis: {
    sonar_security_issues: { title: 'analytics.kpi.sonarSecurityIssues', hint: 'analytics.kpi.sonarSecurityIssuesHint' },
    sonar_hotspots: { title: 'analytics.kpi.sonarHotspots', hint: 'analytics.kpi.sonarHotspotsHint' },
    sonar_hotspots_reviewed: { title: 'analytics.kpi.sonarHotspotsReviewed', hint: 'analytics.kpi.sonarHotspotsReviewedHint' },
    sonar_security_rating: { title: 'analytics.kpi.sonarSecurityRating', hint: 'analytics.kpi.sonarSecurityRatingHint' },
    sonar_reliability_issues: {
      title: 'analytics.kpi.sonarReliabilityIssues',
      hint: 'analytics.kpi.sonarReliabilityIssuesHint',
    },
    sonar_maintainability_issues: {
      title: 'analytics.kpi.sonarMaintainabilityIssues',
      hint: 'analytics.kpi.sonarMaintainabilityIssuesHint',
    },
    sonar_duplication: { title: 'analytics.kpi.sonarDuplication', hint: 'analytics.kpi.sonarDuplicationHint' },
    sonar_gate_failing: { title: 'analytics.kpi.sonarGateFailing', hint: 'analytics.kpi.sonarGateFailingHint' },
  },
  trends: {
    sonar_security: { title: 'analytics.trend.sonarSecurity', hint: 'analytics.trend.sonarSecurityHint' },
    sonar_quality: { title: 'analytics.trend.sonarQuality', hint: 'analytics.trend.sonarQualityHint' },
  },
  series: {},
  breakdowns: {
    sonar_issues_by_quality: 'analytics.breakdown.sonarIssuesByQuality',
    sonar_issues_by_severity: 'analytics.breakdown.sonarIssuesBySeverity',
    sonar_top_rules: 'analytics.breakdown.sonarTopRules',
    sonar_issues_by_area: 'analytics.breakdown.sonarIssuesByArea',
  },
  slices: {
    sonar_issues_by_quality: {
      SECURITY: 'analytics.slice.qualitySecurity',
      RELIABILITY: 'analytics.slice.qualityReliability',
      MAINTAINABILITY: 'analytics.slice.qualityMaintainability',
    },
    sonar_issues_by_severity: {
      BLOCKER: 'analytics.slice.severityBlocker',
      HIGH: 'analytics.slice.severityHigh',
      MEDIUM: 'analytics.slice.severityMedium',
      LOW: 'analytics.slice.severityLow',
      INFO: 'analytics.slice.severityInfo',
    },
  },
  leaderboards: {
    sonar_workspaces: {
      title: 'analytics.leaderboard.sonarWorkspaces',
      hint: 'analytics.leaderboard.sonarWorkspacesHint',
      name: 'analytics.leaderboard.workspace',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    issues: 'analytics.leaderboard.issues',
    security_issues: 'analytics.leaderboard.securityIssues',
    hotspots: 'analytics.leaderboard.hotspots',
    reliability_issues: 'analytics.leaderboard.reliabilityIssues',
    maintainability_issues: 'analytics.leaderboard.maintainabilityIssues',
    lines_of_code: 'analytics.leaderboard.linesOfCode',
  },
};
