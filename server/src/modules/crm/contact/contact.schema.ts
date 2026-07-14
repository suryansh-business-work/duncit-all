export const contactTypeDefs = /* GraphQL */ `
  enum ContactStatus {
    NEW
    IN_PROGRESS
    RESOLVED
    ARCHIVED
  }

  type ContactSubmission {
    id: ID!
    name: String!
    email: String!
    subject: String!
    message: String!
    attachments: [String!]!
    status: ContactStatus!
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (contactSubmissionsTable)."
  type ContactSubmissionTablePage {
    rows: [ContactSubmission!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input SubmitContactInput {
    name: String!
    email: String!
    subject: String
    message: String!
    attachments: [String!]
  }

  type ContactSubmitResult {
    ok: Boolean!
    message: String!
  }

  extend type Query {
    contactSubmissions(status: ContactStatus, email: String): [ContactSubmission!]!
    contactSubmissionsTable(query: TableQueryInput): ContactSubmissionTablePage!
  }

  extend type Mutation {
    submitContactForm(input: SubmitContactInput!): ContactSubmitResult!
    updateContactStatus(contact_id: ID!, status: ContactStatus!): ContactSubmission!
  }
`;
