import { gql } from '@apollo/client';

export interface EmailLogRow {
  id: string;
  to: string;
  cc: string[];
  bcc: string[];
  subject: string;
  template: string;
  fragment_key?: string | null;
  category: string;
  status: 'SENT' | 'SKIPPED' | 'FAILED';
  reason: string;
  provider: string;
  message_id: string;
  source: string;
  source_detail: string;
  duration_ms: number;
  created_at?: string | null;
}

export const EMAIL_LOGS_TABLE = gql`
  query EmailLogsTable($query: TableQueryInput) {
    emailLogsTable(query: $query) {
      total
      rows {
        id
        to
        cc
        bcc
        subject
        template
        fragment_key
        category
        status
        reason
        provider
        message_id
        source
        source_detail
        duration_ms
        created_at
      }
    }
  }
`;

/**
 * One row with its body and variables.
 *
 * A separate query from the table on purpose: `html` is the heavy field, and a
 * page of twenty-five campaign rows would carry a megabyte of it before anyone
 * clicked a thing.
 */
export interface EmailLogDetail extends EmailLogRow {
  html?: string | null;
  vars?: string | null;
}

export const EMAIL_LOG_ONE = gql`
  query EmailLog($id: ID!) {
    emailLog(id: $id) {
      id
      to
      cc
      bcc
      subject
      template
      fragment_key
      category
      status
      reason
      provider
      message_id
      source
      source_detail
      duration_ms
      created_at
      html
      vars
    }
  }
`;

export const EMAIL_LOG_STATS = gql`
  query EmailLogStats($days: Int) {
    emailLogStats(days: $days) {
      days
      sent
      skipped
      failed
      total
      all_time_total
    }
  }
`;

export const DELETE_EMAIL_LOGS = gql`
  mutation DeleteEmailLogs($ids: [ID!]!) {
    deleteEmailLogs(ids: $ids)
  }
`;

/**
 * Deletes the whole collection, not the filtered view.
 *
 * The table's filters live inside the table, the search box is debounced behind
 * what is being typed, and the row count on screen came from an earlier fetch —
 * a filter-scoped wipe would name one number in its confirm and remove another.
 * Deleting by ticked id is the scoped half of this; this half is all of it.
 */
export const DELETE_ALL_EMAIL_LOGS = gql`
  mutation DeleteAllEmailLogs {
    deleteAllEmailLogs
  }
`;

/**
 * SKIPPED is not a failure and not a success — it is a decision. Colouring it
 * like an error would send someone hunting for a fault that is a setting.
 */
export const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  SENT: 'success',
  SKIPPED: 'warning',
  FAILED: 'error',
};

export const STATUS_OPTIONS = [
  { value: 'SENT', label: 'Sent' },
  { value: 'SKIPPED', label: 'Skipped' },
  { value: 'FAILED', label: 'Failed' },
];

/** The surfaces the server can attribute a send to, from the request's Origin. */
export const SOURCE_OPTIONS = [
  { value: 'SERVER', label: 'Server' },
  { value: 'NATIVE', label: 'Native' },
  { value: 'MWEB', label: 'mWeb' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'PORTAL', label: 'Portal' },
  { value: 'CRM', label: 'CRM' },
  { value: 'TEST', label: 'Test' },
];

export const CATEGORY_OPTIONS = [
  'transactional',
  'authentication',
  'marketing',
  'service',
  'notification',
  'support',
  'billing',
  'legal',
  'internal',
].map((value) => ({ value, label: value }));
