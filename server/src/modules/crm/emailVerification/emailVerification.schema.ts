import gql from 'graphql-tag';

export const emailVerificationTypeDefs = gql`
  "Reacher's verdict on a mailbox. An address never checked has no status."
  enum CrmEmailStatus {
    "The mail server confirmed the mailbox exists."
    VERIFIED
    "Deliverable but doubtful — catch-all domain, disposable, role account or full inbox."
    RISKY
    "Malformed, no mail server, or the mailbox does not exist."
    INVALID
    "The mail server would not say (greylisting, timeout, port 25 blocked)."
    UNKNOWN
  }

  enum CrmEmailCheckSource {
    SINGLE
    BULK
  }

  "One check of one address — the CRM keeps every one."
  type CrmEmailVerification {
    id: ID!
    email: String!
    status: CrmEmailStatus!
    is_valid_syntax: Boolean!
    accepts_mail: Boolean!
    can_connect_smtp: Boolean!
    is_deliverable: Boolean!
    is_catch_all: Boolean!
    has_full_inbox: Boolean!
    is_disabled: Boolean!
    is_disposable: Boolean!
    is_role_account: Boolean!
    "A likely intended address when this one looks like a typo."
    suggestion: String!
    source: CrmEmailCheckSource!
    "BULK only: the background job that checked it."
    job_id: String
    "Email of the CRM user who ran the check."
    checked_by: String!
    created_at: String!
  }

  "The newest verdict for one address, shown beside it across the CRM."
  type CrmEmailStatusEntry {
    email: String!
    status: CrmEmailStatus!
    checked_at: String!
    suggestion: String!
  }

  type CrmEmailVerificationTablePage {
    rows: [CrmEmailVerification!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Latest status per address (max 200). Addresses never checked are left out."
    crmEmailStatuses(emails: [String!]!): [CrmEmailStatusEntry!]!
    crmEmailVerificationsTable(query: TableQueryInput): CrmEmailVerificationTablePage!
  }

  extend type Mutation {
    "Check one address now."
    crmVerifyEmail(email: String!): CrmEmailVerification!
    "Check every address in an uploaded CSV/XLSX as a background job."
    crmVerifyEmailsBulk(content_base64: String!, filename: String, url: String): BackgroundJob!
  }
`;
