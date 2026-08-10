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
  user_id: string;
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
