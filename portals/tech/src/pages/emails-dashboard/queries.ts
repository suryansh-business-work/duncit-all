import { gql } from '@apollo/client';

export const EMAIL_LOG_DASHBOARD = gql`
  query EmailLogDashboard($range_days: Int) {
    emailLogDashboard(range_days: $range_days) {
      range_days
      attempts
      recipients
      sent
      skipped
      failed
      partially_refused
      silently_discarded
      not_delivered_reasons {
        key
        count
      }
      not_delivered_templates {
        key
        count
      }
      repeat_failures {
        address
        failures
        last_reason
        last_failed_at
      }
    }
  }
`;

export interface EmailLogCountBucket {
  key: string;
  count: number;
}

export interface EmailLogFailingAddress {
  address: string;
  failures: number;
  last_reason: string;
  last_failed_at?: string | null;
}

/**
 * `attempts` counts log rows and `recipients` counts people. A campaign writes
 * one row per fifty-address bcc batch, so on a campaign day the two differ by up
 * to 50x — the page has to label them apart or every number gets misread.
 */
export interface EmailLogDashboardData {
  range_days: number;
  attempts: number;
  recipients: number;
  sent: number;
  skipped: number;
  failed: number;
  partially_refused: number;
  silently_discarded: number;
  not_delivered_reasons: EmailLogCountBucket[];
  not_delivered_templates: EmailLogCountBucket[];
  repeat_failures: EmailLogFailingAddress[];
}

/**
 * A send with no template slug built its own body — campaigns, chat transcripts
 * and release notes all do. Left empty it renders as a nameless bar, which reads
 * as a broken cell rather than as the group it usually is.
 */
export const RAW_HTML_TEMPLATE_LABEL = 'Raw HTML send — campaign, transcript or release note';

export const labelTemplateBuckets = (buckets: EmailLogCountBucket[]): EmailLogCountBucket[] =>
  buckets.map((b) => ({ key: b.key === '' ? RAW_HTML_TEMPLATE_LABEL : b.key, count: b.count }));
