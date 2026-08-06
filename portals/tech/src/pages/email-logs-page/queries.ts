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

export const EMAIL_LOG_STATS = gql`
  query EmailLogStats($days: Int) {
    emailLogStats(days: $days) {
      days
      sent
      skipped
      failed
      total
    }
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
