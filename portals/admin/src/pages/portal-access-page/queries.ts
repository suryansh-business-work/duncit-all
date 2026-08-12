import { gql } from '@apollo/client';

/** The shared approval inbox, pinned to type = PORTAL_ACCESS by the page. */
export const PORTAL_ACCESS_REQUESTS_TABLE = gql`
  query PortalAccessRequestsTable($query: TableQueryInput) {
    approvalRequestsTable(query: $query) {
      rows {
        id
        status
        title
        summary
        target_id
        subject_name
        subject_email
        requested_by_name
        reviewed_by_name
        reviewed_at
        review_notes
        created_at
      }
      total
      page
      page_size
    }
  }
`;

/** Approval grants the portal's role and emails the requester (server side effect). */
export const APPROVE_PORTAL_ACCESS = gql`
  mutation ApprovePortalAccess($id: ID!) {
    approveRequest(id: $id) {
      id
      status
    }
  }
`;

export const DENY_PORTAL_ACCESS = gql`
  mutation DenyPortalAccess($id: ID!) {
    denyRequest(id: $id) {
      id
      status
    }
  }
`;
