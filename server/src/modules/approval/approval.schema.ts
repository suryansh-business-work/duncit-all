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
    "Ecomm change-request: the target brand/product id + JSON payload of proposed changes."
    target_id: ID
    payload: String
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

  "Server-side table page for the shared table engine (approvalRequestsTable)."
  type ApprovalRequestTablePage {
    rows: [ApprovalRequest!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Admin inbox of approval requests (defaults to all; filter by status/type)."
    approvalRequests(status: ApprovalStatus, type: String): [ApprovalRequest!]!
    "Server-side table page (search/filter/sort/paginate) over the admin approval inbox."
    approvalRequestsTable(query: TableQueryInput): ApprovalRequestTablePage!
    "Products portal: brand/product change requests raised from this portal (kind = BRAND | PRODUCT)."
    myEcommChangeRequests(kind: String): [ApprovalRequest!]!
    "Products portal: partner warehouse-approval requests (optionally by status)."
    warehouseApprovalRequests(status: ApprovalStatus): [ApprovalRequest!]!
  }

  "A proposed label → value change row shown to the reviewer."
  input ApprovalDetailInput {
    label: String!
    value: String
  }

  "Products portal: submit an edit to a brand or product for admin approval (Task B item 2)."
  input EcommChangeRequestInput {
    "BRAND or PRODUCT."
    kind: String!
    target_id: ID!
    target_name: String!
    summary: String
    "Human-readable proposed changes for the reviewer."
    details: [ApprovalDetailInput!]!
    "JSON object of the fields to apply to the entity on approval."
    payload: String!
  }

  extend type Mutation {
    "Admin approves a request — runs the request type's side effect (e.g. drafts the onboarded host/venue/seller, or applies an ecomm change)."
    approveRequest(id: ID!, notes: String): ApprovalRequest!
    "Admin denies a request."
    denyRequest(id: ID!, notes: String): ApprovalRequest!
    "Products portal: raise a brand/product change request for admin approval (Task B item 2)."
    submitEcommChangeRequest(input: EcommChangeRequestInput!): ApprovalRequest!
    "Products portal: approve a partner warehouse so it goes live (usable for shipping)."
    approveWarehouseRequest(id: ID!, notes: String): ApprovalRequest!
    "Products portal: deny a partner warehouse (stays blocked)."
    denyWarehouseRequest(id: ID!, notes: String): ApprovalRequest!
  }
`;
