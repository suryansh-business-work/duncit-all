import { gql } from '@apollo/client';
import type {
  ReportActionType,
  ReportMailRecipient,
  ReportStatus,
  ReportTargetType,
} from '@duncit/utils';

export const CONTENT_REPORT_FIELDS = gql`
  fragment ContentReportFields on ContentReport {
    id
    report_no
    target_type
    target_id
    club_id
    target_preview_url
    target_caption
    reason
    reason_label
    details
    reporter_name
    target_owner_name
    status
    resolution
    resolved_at
    handled_by_name
    target_live
    target_removed_at
    report_count
    history {
      id
      action
      by_name
      at
      note
    }
    created_at
    updated_at
  }
`;

export const CONTENT_REPORTS_TABLE = gql`
  query ContentReportsTable($query: TableQueryInput) {
    contentReportsTable(query: $query) {
      total
      rows {
        ...ContentReportFields
      }
    }
  }
  ${CONTENT_REPORT_FIELDS}
`;

export const UPDATE_CONTENT_REPORT_STATUS = gql`
  mutation UpdateContentReportStatus($id: ID!, $input: UpdateContentReportStatusInput!) {
    updateContentReportStatus(id: $id, input: $input) {
      ...ContentReportFields
    }
  }
  ${CONTENT_REPORT_FIELDS}
`;

export const TAKE_DOWN_REPORTED_CONTENT = gql`
  mutation TakeDownReportedContent($id: ID!, $note: String) {
    takeDownReportedContent(id: $id, note: $note) {
      ...ContentReportFields
    }
  }
  ${CONTENT_REPORT_FIELDS}
`;

export const MARK_REPORTED_CONTENT_OK = gql`
  mutation MarkReportedContentOk($id: ID!, $note: String) {
    markReportedContentOk(id: $id, note: $note) {
      ...ContentReportFields
    }
  }
  ${CONTENT_REPORT_FIELDS}
`;

export const SEND_CONTENT_REPORT_MAIL = gql`
  mutation SendContentReportMail($id: ID!, $input: ContentReportMailInput!) {
    sendContentReportMail(id: $id, input: $input) {
      ...ContentReportFields
    }
  }
  ${CONTENT_REPORT_FIELDS}
`;

export const REPORT_CATEGORY_FIELDS = gql`
  fragment ReportCategoryFields on ReportCategory {
    id
    key
    label
    description
    requires_details
    sort_order
    is_active
    updated_at
  }
`;

export const REPORT_CATEGORIES_TABLE = gql`
  query ReportCategoriesTable($query: TableQueryInput) {
    reportCategoriesTable(query: $query) {
      total
      rows {
        ...ReportCategoryFields
      }
    }
  }
  ${REPORT_CATEGORY_FIELDS}
`;

export const CREATE_REPORT_CATEGORY = gql`
  mutation CreateReportCategory($input: ReportCategoryInput!) {
    createReportCategory(input: $input) {
      ...ReportCategoryFields
    }
  }
  ${REPORT_CATEGORY_FIELDS}
`;

export const UPDATE_REPORT_CATEGORY = gql`
  mutation UpdateReportCategory($id: ID!, $input: ReportCategoryInput!) {
    updateReportCategory(id: $id, input: $input) {
      ...ReportCategoryFields
    }
  }
  ${REPORT_CATEGORY_FIELDS}
`;

export const DELETE_REPORT_CATEGORY = gql`
  mutation DeleteReportCategory($id: ID!) {
    deleteReportCategory(id: $id)
  }
`;

/** One line of a report's staff-only activity log. */
export interface ContentReportAction {
  id: string;
  action: ReportActionType;
  by_name: string;
  at: string;
  /** The reviewer's note, or the mail that was sent. */
  note: string;
}

export interface ContentReport {
  id: string;
  /** Permanent handle, RPT-000001. Never edited, never reused. */
  report_no: string;
  target_type: ReportTargetType;
  target_id: string;
  club_id: string | null;
  /** Copied at report time — the story it names may already have expired. */
  target_preview_url: string;
  target_caption: string;
  /** The report category's key; `reason_label` is what a reviewer reads. */
  reason: string;
  reason_label: string;
  details: string;
  reporter_name: string;
  target_owner_name: string;
  status: ReportStatus;
  resolution: string;
  resolved_at: string | null;
  handled_by_name: string;
  /** True while the reported content is still up for everyone. */
  target_live: boolean;
  /** When Legal took it down; null if we never did. */
  target_removed_at: string | null;
  /** How many different people reported this same content. */
  report_count: number;
  history: ContentReportAction[];
  created_at: string;
  updated_at: string;
}

/** A reason the report dialog offers — the rows of the Settings tab. */
export interface ReportCategory {
  id: string;
  key: string;
  label: string;
  description: string;
  requires_details: boolean;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

/** What `sendContentReportMail` takes. */
export interface ContentReportMailInput {
  recipient: ReportMailRecipient;
  subject: string;
  message: string;
}
