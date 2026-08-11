import { gql } from '@apollo/client';

export interface MailPreferenceCategoryStat {
  category: string;
  opted_out_now: number;
  opt_outs: number;
  opt_ins: number;
}

export interface MailPreferenceBucket {
  key: string;
  count: number;
}

export interface MailPreferenceAnalytics {
  range_days: number;
  people_opted_out: number;
  people_opted_out_all: number;
  opt_outs: number;
  opt_ins: number;
  by_category: MailPreferenceCategoryStat[];
  by_source: MailPreferenceBucket[];
}

/** One change, by one person, to one category. */
export interface MailPreferenceLogRow {
  id: string;
  email: string;
  user_id: string | null;
  user_name: string;
  category: string;
  enabled: boolean;
  source: string;
  source_detail: string;
  created_at: string | null;
}

export const MAIL_PREFERENCE_ANALYTICS = gql`
  query MailPreferenceAnalytics($range_days: Int) {
    mailPreferenceAnalytics(range_days: $range_days) {
      range_days
      people_opted_out
      people_opted_out_all
      opt_outs
      opt_ins
      by_category {
        category
        opted_out_now
        opt_outs
        opt_ins
      }
      by_source {
        key
        count
      }
    }
  }
`;

export const MAIL_PREFERENCE_LOGS_TABLE = gql`
  query MailPreferenceLogsTable($query: TableQueryInput) {
    mailPreferenceLogsTable(query: $query) {
      rows {
        id
        email
        user_id
        user_name
        category
        enabled
        source
        source_detail
        created_at
      }
      total
      page
      page_size
    }
  }
`;
