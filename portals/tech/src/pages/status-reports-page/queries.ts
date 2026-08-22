import { gql } from '@apollo/client';

/**
 * Problems reported by hand from the public status page.
 *
 * The probes answer one question — is the host returning an HTTP status — and
 * most real breakage never touches it. These rows are the other half: a person
 * saying what actually failed, read here beside the telemetry the machines
 * write.
 */
export const STATUS_REPORTS_TABLE = gql`
  query StatusReportsTable($query: TableQueryInput) {
    statusReportsTable(query: $query) {
      total
      rows {
        id
        service_key
        service_name
        impact
        name
        email
        page_url
        message
        environment
        status
        ip
        user_agent
        user_id
        note
        created_at
        updated_at
      }
    }
  }
`;

export const UPDATE_STATUS_REPORT = gql`
  mutation UpdateStatusReport($report_id: ID!, $status: StatusReportStatus!, $note: String) {
    updateStatusReport(report_id: $report_id, status: $status, note: $note) {
      id
      status
      note
      updated_at
    }
  }
`;

/**
 * A public, unauthenticated form attracts spam the way every public form does,
 * so an operator needs a way to take a row off the board permanently.
 */
export const DELETE_STATUS_REPORTS = gql`
  mutation DeleteStatusReports($ids: [ID!]!) {
    deleteStatusReports(ids: $ids)
  }
`;

export type StatusReportStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type StatusReportImpact =
  | 'CANNOT_ACCESS'
  | 'ERRORS'
  | 'SLOW'
  | 'LOGIN'
  | 'PAYMENT'
  | 'OTHER';

export interface StatusReportRow {
  id: string;
  service_key: string;
  service_name: string;
  impact: StatusReportImpact;
  name: string;
  email: string;
  page_url: string;
  message: string;
  environment: string;
  status: StatusReportStatus;
  ip: string | null;
  user_agent: string | null;
  user_id: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

type Translate = (key: string) => string;

/**
 * The impact and triage vocabularies, as VALUE + KEY pairs in the SHARED
 * `status.*` namespace — the same rows the status page's dropdown renders, so
 * a report cannot be filed under one word and read under another (rule 34).
 * Written out rather than composed, because the localization gate reads
 * literal keys and seeds only what it can see.
 */
const IMPACT_KEYS: ReadonlyArray<{ value: StatusReportImpact; key: string }> = [
  { value: 'CANNOT_ACCESS', key: 'status.impact.cannotAccess' },
  { value: 'ERRORS', key: 'status.impact.errors' },
  { value: 'SLOW', key: 'status.impact.slow' },
  { value: 'LOGIN', key: 'status.impact.login' },
  { value: 'PAYMENT', key: 'status.impact.payment' },
  { value: 'OTHER', key: 'status.impact.other' },
];

const STATUS_KEYS: ReadonlyArray<{ value: StatusReportStatus; key: string }> = [
  { value: 'NEW', key: 'status.reportStatus.new' },
  { value: 'IN_PROGRESS', key: 'status.reportStatus.inProgress' },
  { value: 'RESOLVED', key: 'status.reportStatus.resolved' },
  { value: 'CLOSED', key: 'status.reportStatus.closed' },
];

export const impactOptions = (t: Translate) =>
  IMPACT_KEYS.map((row) => ({ value: row.value, label: t(row.key) }));

export const statusOptions = (t: Translate) =>
  STATUS_KEYS.map((row) => ({ value: row.value, label: t(row.key) }));

const IMPACT_LABEL_KEY = new Map(IMPACT_KEYS.map((row) => [row.value, row.key]));
const STATUS_LABEL_KEY = new Map(STATUS_KEYS.map((row) => [row.value, row.key]));

export const impactLabel = (t: Translate, impact: StatusReportImpact) =>
  t(IMPACT_LABEL_KEY.get(impact) ?? 'status.impact.other');

export const statusLabel = (t: Translate, status: StatusReportStatus) =>
  t(STATUS_LABEL_KEY.get(status) ?? 'status.reportStatus.new');

/** New shouts, in-progress warns, and the two closed states go quiet. */
export const STATUS_COLOR: Record<StatusReportStatus, 'error' | 'warning' | 'success' | 'default'> =
  {
    NEW: 'error',
    IN_PROGRESS: 'warning',
    RESOLVED: 'success',
    CLOSED: 'default',
  };

/** Loud where the reporter is fully blocked, softer where they are not. */
export const IMPACT_COLOR: Record<StatusReportImpact, 'error' | 'warning' | 'default'> = {
  CANNOT_ACCESS: 'error',
  LOGIN: 'error',
  PAYMENT: 'error',
  ERRORS: 'warning',
  SLOW: 'warning',
  OTHER: 'default',
};
