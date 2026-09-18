import type { PageCopy } from './types';

/** Operations > Legal. */
export const LEGAL_COPY: PageCopy = {
  kpis: {
    leg_grievances_filed: { title: 'analytics.kpi.legGrievancesFiled', hint: 'analytics.kpi.legGrievancesFiledHint' },
    leg_grievances_resolved: {
      title: 'analytics.kpi.legGrievancesResolved',
      hint: 'analytics.kpi.legGrievancesResolvedHint',
    },
    leg_grievances_open: { title: 'analytics.kpi.legGrievancesOpen', hint: 'analytics.kpi.legGrievancesOpenHint' },
    leg_grievances_overdue: {
      title: 'analytics.kpi.legGrievancesOverdue',
      hint: 'analytics.kpi.legGrievancesOverdueHint',
    },
    leg_grievance_days: { title: 'analytics.kpi.legGrievanceDays', hint: 'analytics.kpi.legGrievanceDaysHint' },
    leg_reports_filed: { title: 'analytics.kpi.legReportsFiled', hint: 'analytics.kpi.legReportsFiledHint' },
    leg_reports_open: { title: 'analytics.kpi.legReportsOpen', hint: 'analytics.kpi.legReportsOpenHint' },
    leg_sent_for_signing: { title: 'analytics.kpi.legSentForSigning', hint: 'analytics.kpi.legSentForSigningHint' },
    leg_signed: { title: 'analytics.kpi.legSigned', hint: 'analytics.kpi.legSignedHint' },
    leg_signing_days: { title: 'analytics.kpi.legSigningDays', hint: 'analytics.kpi.legSigningDaysHint' },
    leg_awaiting_signature: {
      title: 'analytics.kpi.legAwaitingSignature',
      hint: 'analytics.kpi.legAwaitingSignatureHint',
    },
    leg_policy_acceptance: {
      title: 'analytics.kpi.legPolicyAcceptance',
      hint: 'analytics.kpi.legPolicyAcceptanceHint',
    },
  },
  trends: {
    leg_grievances: { title: 'analytics.trend.legGrievances', hint: 'analytics.trend.legGrievancesHint' },
    leg_reports: { title: 'analytics.trend.legReports', hint: 'analytics.trend.legReportsHint' },
    leg_acceptances: { title: 'analytics.trend.legAcceptances', hint: 'analytics.trend.legAcceptancesHint' },
  },
  series: {
    leg_grievances_rejected: 'analytics.series.legGrievancesRejected',
    leg_reports_actioned: 'analytics.series.legReportsActioned',
    leg_reports_dismissed: 'analytics.series.legReportsDismissed',
    leg_accepted_at_signup: 'analytics.series.legAcceptedAtSignup',
    leg_accepted_in_account: 'analytics.series.legAcceptedInAccount',
  },
  breakdowns: {
    leg_grievance_status: 'analytics.breakdown.legGrievanceStatus',
    leg_grievance_source: 'analytics.breakdown.legGrievanceSource',
    leg_grievance_escalation: 'analytics.breakdown.legGrievanceEscalation',
    leg_report_reason: 'analytics.breakdown.legReportReason',
    leg_report_outcome: 'analytics.breakdown.legReportOutcome',
    leg_report_target: 'analytics.breakdown.legReportTarget',
  },
  slices: {
    leg_grievance_status: {
      RECEIVED: 'analytics.slice.legReceived',
      IN_REVIEW: 'analytics.slice.legInReview',
      RESOLVED: 'analytics.slice.legResolved',
      REJECTED: 'analytics.slice.legRejected',
    },
    leg_grievance_source: {
      APP: 'analytics.slice.legApp',
      WEBSITE: 'analytics.slice.legWebsite',
      PORTAL: 'analytics.slice.legPortal',
      EMAIL: 'analytics.slice.legEmail',
    },
    leg_grievance_escalation: {
      leg_with_ticket: 'analytics.slice.legWithTicket',
      leg_without_ticket: 'analytics.slice.legWithoutTicket',
    },
    leg_report_reason: {
      SPAM: 'analytics.slice.legSpam',
      NUDITY: 'analytics.slice.legNudity',
      VIOLENCE: 'analytics.slice.legViolence',
      HATE: 'analytics.slice.legHate',
      HARASSMENT: 'analytics.slice.legHarassment',
      MISINFORMATION: 'analytics.slice.legMisinformation',
      SCAM: 'analytics.slice.legScam',
      OTHER: 'analytics.slice.legOther',
    },
    leg_report_outcome: {
      RECEIVED: 'analytics.slice.legReceived',
      IN_REVIEW: 'analytics.slice.legInReview',
      ACTIONED: 'analytics.slice.legActioned',
      DISMISSED: 'analytics.slice.legDismissed',
    },
    leg_report_target: {
      STORY: 'analytics.slice.legStory',
      POST: 'analytics.slice.legPost',
      POD: 'analytics.slice.legPod',
      CLUB: 'analytics.slice.legClub',
      PROFILE: 'analytics.slice.legProfile',
      PRODUCT: 'analytics.slice.legProduct',
    },
  },
  leaderboards: {
    leg_policies: {
      title: 'analytics.leaderboard.legPolicies',
      hint: 'analytics.leaderboard.legPoliciesHint',
      name: 'analytics.leaderboard.legPolicy',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    leg_accepted: 'analytics.leaderboard.legAccepted',
    leg_pending: 'analytics.leaderboard.legPending',
    leg_acceptance_rate: 'analytics.leaderboard.legAcceptanceRate',
    leg_wordings: 'analytics.leaderboard.legWordings',
  },
};
