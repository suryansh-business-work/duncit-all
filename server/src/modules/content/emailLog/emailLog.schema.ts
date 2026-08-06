export const emailLogTypeDefs = /* GraphQL */ `
  """
  One attempt to send an email — including the ones that never left.

  A provider's dashboard can only show what reached it. The rows that matter
  most here are the ones that did not: a switched-off template, a recipient with
  no address, a refusal. Those have no other record anywhere.
  """
  type EmailLog {
    id: ID!
    to: String!
    cc: [String!]!
    bcc: [String!]!
    subject: String!
    "The template slug, or empty for a raw-HTML send."
    template: String!
    "The header/footer fragment the template named, if any."
    fragment_key: String
    category: String!
    "SENT, SKIPPED (deliberately not sent) or FAILED."
    status: String!
    "Why, in one line, whenever the status is not SENT."
    reason: String!
    "smtp, resend, or none when it never left."
    provider: String!
    "The provider's own id, for tracing a delivery complaint back to them."
    message_id: String!
    "Which surface caused it: SERVER, NATIVE, MWEB, WEBSITE, PORTAL, CRM, TEST."
    source: String!
    "The exact host or portal, when known."
    source_detail: String!
    duration_ms: Int!
    created_at: String
  }

  type EmailLogTablePage {
    rows: [EmailLog!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Headline counts for the page's summary strip."
  type EmailLogStats {
    days: Int!
    sent: Int!
    skipped: Int!
    failed: Int!
    total: Int!
  }

  extend type Query {
    "Every email attempt, newest first. Filter by status, category, source, template."
    emailLogsTable(query: TableQueryInput): EmailLogTablePage!
    emailLogStats(days: Int): EmailLogStats!
  }
`;
