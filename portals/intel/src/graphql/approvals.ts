import { gql } from '@apollo/client';
import type { IntelApproval } from '@duncit/gql-types';

/** Approval documents: the card under a chat answer and the Approvals page share one fragment. */

export const APPROVAL_FIELDS = gql`
  fragment IntelApprovalFields on IntelApproval {
    id
    kind
    status
    requested_by
    conversation_id
    connector_name
    environment
    database
    collection
    action
    tool_class
    request
    preview
    impact
    reason
    four_eyes
    decided_by
    decided_at
    decision_note
    result
    error
    expires_at
    created_at
  }
`;

export const INTEL_APPROVALS = gql`
  query IntelApprovals($status: String, $mine: Boolean, $limit: Int) {
    intelApprovals(status: $status, mine: $mine, limit: $limit) {
      ...IntelApprovalFields
    }
  }
  ${APPROVAL_FIELDS}
`;

export const INTEL_APPROVAL = gql`
  query IntelApproval($id: ID!) {
    intelApproval(id: $id) {
      ...IntelApprovalFields
    }
  }
  ${APPROVAL_FIELDS}
`;

export const INTEL_DECIDE = gql`
  mutation IntelDecideApproval($id: ID!, $approve: Boolean!, $note: String) {
    intelDecideApproval(id: $id, approve: $approve, note: $note) {
      ...IntelApprovalFields
    }
  }
  ${APPROVAL_FIELDS}
`;

export interface ApprovalsData {
  intelApprovals: IntelApproval[];
}
export interface ApprovalData {
  intelApproval: IntelApproval;
}
export interface DecideData {
  intelDecideApproval: IntelApproval;
}
