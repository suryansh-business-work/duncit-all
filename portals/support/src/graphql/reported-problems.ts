import { gql } from '@apollo/client';

export interface FeedbackReportRow {
  id: string;
  report_no: string;
  user_name: string;
  user_email: string;
  category: string;
  message: string;
  media_urls: string[];
  reporter_phone: string;
  reporter_city: string;
  reporter_locale: string;
  reporter_roles: string[];
  platform: string;
  app_version: string;
  device_os: string;
  device_model: string;
  source_screen: string;
  status: string;
  slack_ts?: string | null;
  slack_error?: string | null;
  created_at: string;
  /** Null when the report arrived by email from an address with no account. */
  user_id: string | null;
}

export interface ReportProblemCategory {
  key: string;
  label: string;
  is_active: boolean;
  sort_order: number;
}

export interface ReportProblemConfig {
  categories: ReportProblemCategory[];
  message_label: string;
  message_hint: string;
  message_min_length: number;
  allow_media: boolean;
  max_media: number;
}

/** One channel the Slack bot can see, as offered in the routing picker. */
export interface SlackChannelOption {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
}

/** Where a reported problem is announced. Support-only — it carries the
 * workspace's channel list, which the app's own config query must not. */
export interface ReportProblemSlackSettings {
  slack_configured: boolean;
  enabled: boolean;
  channel_id: string;
  channel_name: string;
  channels: SlackChannelOption[];
  error: string;
}

const REPORT_FIELDS = `
  id
  user_id
  report_no
  user_name
  user_email
  category
  message
  media_urls
  reporter_phone
  reporter_city
  reporter_locale
  reporter_roles
  platform
  app_version
  device_os
  device_model
  source_screen
  status
  slack_ts
  slack_error
  created_at
`;

export const REPORTED_PROBLEMS_TABLE = gql`
  query ReportedProblemsTable($query: TableQueryInput) {
    reportedProblemsTable(query: $query) {
      total
      rows {
        ${REPORT_FIELDS}
      }
    }
  }
`;

export const REPORTED_PROBLEM = gql`
  query ReportedProblem($id: ID!) {
    reportedProblem(id: $id) {
      ${REPORT_FIELDS}
      updated_at
      user_id
    }
  }
`;

export const SET_REPORT_STATUS = gql`
  mutation SetFeedbackReportStatus($id: ID!, $status: FeedbackStatus!) {
    setFeedbackReportStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

export const REPORT_PROBLEM_CONFIG = gql`
  query ReportProblemConfigForSupport {
    reportProblemConfig {
      categories {
        key
        label
        is_active
        sort_order
      }
      message_label
      message_hint
      message_min_length
      allow_media
      max_media
    }
  }
`;

export const UPDATE_REPORT_PROBLEM_CONFIG = gql`
  mutation UpdateReportProblemConfig($input: UpdateReportProblemConfigInput!) {
    updateReportProblemConfig(input: $input) {
      categories {
        key
        label
        is_active
        sort_order
      }
      message_label
      message_hint
      message_min_length
      allow_media
      max_media
    }
  }
`;

const SLACK_FIELDS = `
  slack_configured
  enabled
  channel_id
  channel_name
  error
  channels {
    id
    name
    is_private
    is_member
  }
`;

export const REPORT_PROBLEM_SLACK = gql`
  query ReportProblemSlackSettings {
    reportProblemSlackSettings {
      ${SLACK_FIELDS}
    }
  }
`;

export const UPDATE_REPORT_PROBLEM_SLACK = gql`
  mutation UpdateReportProblemSlack($input: UpdateReportProblemSlackInput!) {
    updateReportProblemSlack(input: $input) {
      ${SLACK_FIELDS}
    }
  }
`;
