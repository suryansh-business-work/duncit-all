import gql from 'graphql-tag';

export const statusReportTypeDefs = gql`
  "How a report was triaged. NEW until somebody in Tech picks it up."
  enum StatusReportStatus {
    NEW
    IN_PROGRESS
    RESOLVED
    CLOSED
  }

  "What the reporter is actually seeing, so a row can be triaged unread."
  enum StatusReportImpact {
    CANNOT_ACCESS
    ERRORS
    SLOW
    LOGIN
    PAYMENT
    OTHER
  }

  """
  One problem report typed into the public status page.

  The probes answer "is the host returning an HTTP status"; this is everything
  they cannot see — a login that loops, a blank page, a payment that hangs.
  """
  type StatusReport {
    id: ID!
    "Catalogue slug of the affected service, or empty when the reporter was not sure."
    service_key: String!
    "The catalogue's display name as it read when the report was filed."
    service_name: String!
    "The affected service's address, as the catalogue held it when the report was filed."
    service_url: String!
    impact: StatusReportImpact!
    name: String!
    email: String!
    page_url: String!
    message: String!
    environment: String!
    status: StatusReportStatus!
    """
    Read off the request by the server, never from the submitted body — the
    form is public, so a body could claim to be anyone.
    """
    ip: String
    user_agent: String
    "Set only when the reporter happened to be signed in on that browser."
    user_id: String
    "Screenshots the reporter attached."
    image_urls: [String!]!
    "Images an operator attached while triaging."
    staff_image_urls: [String!]!
    "Triage note written from the Tech portal."
    note: String!
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (statusReportsTable)."
  type StatusReportTablePage {
    rows: [StatusReport!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  """
  One screenshot, sent inline with the report.

  Base64 rather than an upload URL on purpose: handing an unauthenticated form
  a credential that can put files on our storage is a bigger door than the one
  it is meant to open. The server does the upload.
  """
  input StatusReportImageInput {
    file_name: String!
    "Raw base64, or a data: URI straight out of a FileReader."
    data: String!
    mime_type: String
  }

  input SubmitStatusReportInput {
    "Catalogue slug from /status/services. Omit or leave empty when unsure."
    service_key: String
    impact: StatusReportImpact
    name: String!
    email: String!
    page_url: String
    message: String!
    "Screenshots. Capped server-side — the rest are dropped, never the report."
    images: [StatusReportImageInput!]
    "Human check, required only when nobody is signed in. See the captchaChallenge query."
    captcha_token: String
    captcha_answer: String
  }

  type StatusReportSubmitResult {
    ok: Boolean!
    id: ID
  }

  extend type Query {
    "Tech portal only. Every report, through the shared table engine."
    statusReportsTable(query: TableQueryInput): StatusReportTablePage!
  }

  extend type Mutation {
    """
    PUBLIC and unauthenticated, on purpose: somebody locked out of every
    console is exactly who this form exists for.
    """
    submitStatusReport(input: SubmitStatusReportInput!): StatusReportSubmitResult!
    """
    Triage one report: its state, the note, and any images the operator added.
    Omitting staff_images leaves the ones already there alone.
    """
    updateStatusReport(
      report_id: ID!
      status: StatusReportStatus!
      note: String
      staff_images: [String!]
    ): StatusReport!
    deleteStatusReports(ids: [ID!]!): Int!
  }
`;
