import gql from 'graphql-tag';

export const approvalTypeDefs = gql`
  enum ApprovalStatus {
    PENDING
    APPROVED
    DENIED
  }

  "A single label → value row the admin inbox renders (survey answers, feedback…)."
  type ApprovalDetail {
    label: String!
    value: String
  }

  "A request raised by a portal for the Admin console to approve or deny."
  type ApprovalRequest {
    id: ID!
    type: String!
    status: ApprovalStatus!
    source_portal: String
    title: String
    summary: String
    details: [ApprovalDetail!]!
    kind: SurveyKind
    subject_user_id: ID
    subject_name: String
    subject_email: String
    subject_phone: String
    meeting_id: ID
    requested_by_name: String
    reviewed_by_name: String
    reviewed_at: String
    review_notes: String
    created_at: String
    updated_at: String
  }

  extend type Query {
    "Admin inbox of approval requests (defaults to all; filter by status/type)."
    approvalRequests(status: ApprovalStatus, type: String): [ApprovalRequest!]!
  }

  extend type Mutation {
    "Admin approves a request — runs the request type's side effect (e.g. drafts the onboarded host/venue/seller)."
    approveRequest(id: ID!, notes: String): ApprovalRequest!
    "Admin denies a request."
    denyRequest(id: ID!, notes: String): ApprovalRequest!
  }
`;
