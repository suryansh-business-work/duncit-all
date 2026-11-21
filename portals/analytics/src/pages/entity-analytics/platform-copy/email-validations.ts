import type { PageCopy } from './types';

/**
 * Growth > Email Validations, also Admin > Email Validations > Dashboard.
 * Consoles are named by the data; verdicts, tests and sources are named here.
 */
export const EMAIL_VALIDATIONS_COPY: PageCopy = {
  kpis: {
    ev_validations: { title: 'analytics.kpi.evValidations', hint: 'analytics.kpi.evValidationsHint' },
    ev_unique_emails: { title: 'analytics.kpi.evUniqueEmails', hint: 'analytics.kpi.evUniqueEmailsHint' },
    ev_valid_rate: { title: 'analytics.kpi.evValidRate', hint: 'analytics.kpi.evValidRateHint' },
    ev_valid: { title: 'analytics.kpi.evValid', hint: 'analytics.kpi.evValidHint' },
    ev_risky: { title: 'analytics.kpi.evRisky', hint: 'analytics.kpi.evRiskyHint' },
    ev_invalid: { title: 'analytics.kpi.evInvalid', hint: 'analytics.kpi.evInvalidHint' },
    ev_revalidations: { title: 'analytics.kpi.evRevalidations', hint: 'analytics.kpi.evRevalidationsHint' },
    ev_typos: { title: 'analytics.kpi.evTypos', hint: 'analytics.kpi.evTyposHint' },
  },
  trends: {
    ev_verdicts: { title: 'analytics.trend.evVerdicts', hint: 'analytics.trend.evVerdictsHint' },
    ev_activity: { title: 'analytics.trend.evActivity', hint: 'analytics.trend.evActivityHint' },
  },
  series: {},
  breakdowns: {
    ev_by_verdict: 'analytics.breakdown.evByVerdict',
    ev_by_portal: 'analytics.breakdown.evByPortal',
    ev_failed_checks: 'analytics.breakdown.evFailedChecks',
    ev_by_source: 'analytics.breakdown.evBySource',
  },
  slices: {
    ev_by_verdict: {
      VALID: 'analytics.slice.evValid',
      RISKY: 'analytics.slice.evRisky',
      INVALID: 'analytics.slice.evInvalid',
    },
    ev_failed_checks: {
      SYNTAX: 'analytics.slice.evSyntax',
      MAIL_SERVER: 'analytics.slice.evMailServer',
      SMTP_CONNECTION: 'analytics.slice.evSmtpConnection',
      MAILBOX_EXISTS: 'analytics.slice.evMailboxExists',
      MAILBOX_ENABLED: 'analytics.slice.evMailboxEnabled',
      INBOX_HAS_SPACE: 'analytics.slice.evInboxHasSpace',
      NOT_CATCH_ALL: 'analytics.slice.evNotCatchAll',
      NOT_DISPOSABLE: 'analytics.slice.evNotDisposable',
      NOT_ROLE_ACCOUNT: 'analytics.slice.evNotRoleAccount',
    },
    ev_by_source: {
      SINGLE: 'analytics.slice.evSingle',
      BULK: 'analytics.slice.evBulk',
      REVALIDATE: 'analytics.slice.evRevalidate',
    },
  },
  leaderboards: {
    ev_top_portals: {
      title: 'analytics.leaderboard.evTopPortals',
      hint: 'analytics.leaderboard.evTopPortalsHint',
      name: 'analytics.leaderboard.evPortal',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    ev_validations: 'analytics.leaderboard.evValidations',
    ev_valid: 'analytics.leaderboard.evValid',
    ev_risky: 'analytics.leaderboard.evRisky',
    ev_invalid: 'analytics.leaderboard.evInvalid',
    ev_valid_rate: 'analytics.leaderboard.evValidRate',
  },
};
