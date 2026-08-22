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
        service_url
        impact
        name
        email
        page_url
        message
        image_urls
        staff_image_urls
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
  mutation UpdateStatusReport(
    $report_id: ID!
    $status: StatusReportStatus!
    $note: String
    $staff_images: [String!]
  ) {
    updateStatusReport(
      report_id: $report_id
      status: $status
      note: $note
      staff_images: $staff_images
    ) {
      id
      status
      note
      staff_image_urls
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
  service_url: string;
  impact: StatusReportImpact;
  name: string;
  email: string;
  page_url: string;
  message: string;
  image_urls: string[];
  staff_image_urls: string[];
  environment: string;
  status: StatusReportStatus;
  ip: string | null;
  user_agent: string | null;
  user_id: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

/**
 * WHICH WEBSITE the report is about.
 *
 * The catalogue address the service had when the report was filed, so a
 * service renamed or moved since does not rewrite its own history. When the
 * reporter was not sure which service it was, the page they pasted still says
 * where they were, and its origin is the next best answer.
 */
export function reportWebsite(row: StatusReportRow): string {
  if (row.service_url) return row.service_url;
  if (!row.page_url) return '';
  try {
    return new URL(row.page_url).origin;
  } catch {
    return '';
  }
}

/**
 * MediaListField speaks one URL per line, like every other media list in the
 * portals; the API speaks arrays. The two conversions live together so a round
 * trip through the dialog cannot lose or duplicate a line.
 */
export const toMediaList = (urls: readonly string[]): string => urls.join('\n');

export const fromMediaList = (value: string): string[] =>
  value
    .split('\n')
    .map((url) => url.trim())
    .filter(Boolean);

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
