import { gql } from '@apollo/client';
import type { ReportReason, ReportStatus, ReportTargetType } from '@duncit/utils';

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
    details
    reporter_name
    target_owner_name
    status
    resolution
    resolved_at
    handled_by_name
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
  reason: ReportReason;
  details: string;
  reporter_name: string;
  target_owner_name: string;
  status: ReportStatus;
  resolution: string;
  resolved_at: string | null;
  handled_by_name: string;
  created_at: string;
  updated_at: string;
}
