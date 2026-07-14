import { gql } from '@apollo/client';

export const APPROVAL_REQUESTS = gql`
  query ApprovalRequests($status: ApprovalStatus, $type: String) {
    approvalRequests(status: $status, type: $type) {
      id
      type
      status
      source_portal
      title
      summary
      details {
        label
        value
      }
      kind
      subject_name
      subject_email
      subject_phone
      requested_by_name
      reviewed_by_name
      reviewed_at
      review_notes
      created_at
      updated_at
    }
  }
`;

/** Same selection as APPROVAL_REQUESTS rows — table rows keep feeding ReviewDialog. */
const APPROVAL_ROW_FIELDS = gql`
  fragment ApprovalRowFields on ApprovalRequest {
    id
    type
    status
    source_portal
    title
    summary
    details {
      label
      value
    }
    kind
    subject_name
    subject_email
    subject_phone
    requested_by_name
    reviewed_by_name
    reviewed_at
    review_notes
    created_at
    updated_at
  }
`;

export const APPROVAL_REQUESTS_TABLE = gql`
  query ApprovalRequestsTable($query: TableQueryInput) {
    approvalRequestsTable(query: $query) {
      total
      rows {
        ...ApprovalRowFields
      }
    }
  }
  ${APPROVAL_ROW_FIELDS}
`;

export const APPROVE_REQUEST = gql`
  mutation ApproveRequest($id: ID!, $notes: String) {
    approveRequest(id: $id, notes: $notes) {
      id
      status
    }
  }
`;

export const DENY_REQUEST = gql`
  mutation DenyRequest($id: ID!, $notes: String) {
    denyRequest(id: $id, notes: $notes) {
      id
      status
    }
  }
`;
