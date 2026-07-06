export const hostRequestTypeDefs = /* GraphQL */ `
  enum HostRequestStatus {
    REQUESTED
    ACKNOWLEDGED
    APPROVED
    REJECTED
  }

  type HostRequestAudit {
    status: String!
    by_id: ID
    by_name: String!
    at: String!
    note: String!
  }

  type HostRequest {
    id: ID!
    request_no: String!
    host_user_id: ID!
    host_name: String!
    host_email: String!
    host_phone: String!
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    super_category_name: String!
    category_name: String!
    sub_category_name: String!
    survey_id: ID
    status: HostRequestStatus!
    reviewer_notes: String!
    audit_log: [HostRequestAudit!]!
    created_at: String!
    updated_at: String!
  }

  input HostRequestSurveyAnswer {
    qid: ID!
    value: String
    values: [String!]
  }

  input SubmitHostRequestInput {
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    survey_id: ID
    answers: [HostRequestSurveyAnswer!]
  }

  extend type Query {
    myHostRequest: HostRequest
    myHostRequests: [HostRequest!]!
    myHostTakenCategoryIds: [ID!]!
    hostRequests(status: HostRequestStatus): [HostRequest!]!
    hostRequest(id: ID!): HostRequest
  }

  extend type Mutation {
    submitHostRequest(input: SubmitHostRequestInput!): HostRequest!
    acknowledgeHostRequest(id: ID!): HostRequest!
    approveHostRequest(id: ID!, notes: String): HostRequest!
    rejectHostRequest(id: ID!, notes: String!): HostRequest!
    "Onboarding: permanently remove a host request record."
    deleteHostRequest(id: ID!): Boolean!
  }
`;
