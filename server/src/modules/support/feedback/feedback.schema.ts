export const feedbackTypeDefs = /* GraphQL */ `
  enum FeedbackStatus {
    OPEN
    IN_REVIEW
    RESOLVED
    CLOSED
  }

  """
  One problem reported from the app through "Report a Problem".

  The row is the STORE OF RECORD. Slack is only a notification, which is why
  slack_error exists: an announcement that never went out must be visible here
  rather than costing the reporter their report.
  """
  type FeedbackReport {
    id: ID!
    "Permanent, human-readable id (DUN-RPT-000001)."
    report_no: String!
    user_id: ID!
    user_name: String!
    user_email: String!
    category: String!
    message: String!
    "Screenshots the reporter attached."
    media_urls: [String!]!
    platform: String!
    app_version: String!
    status: FeedbackStatus!
    "Slack message timestamp when the announcement went out."
    slack_ts: String
    "Why the Slack announcement did not go out. Null when it did."
    slack_error: String
    created_at: String!
    updated_at: String!
  }

  type FeedbackReportTablePage {
    rows: [FeedbackReport!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One selectable chip on the app's Report a Problem form."
  type ReportProblemCategory {
    "Stable key stored on the report, so renaming a label never orphans rows."
    key: String!
    label: String!
    is_active: Boolean!
    sort_order: Int!
  }

  """
  What the app renders on Report a Problem.

  The chips and the prompt used to be hardcoded in the app, so adding a category
  meant a release. Support edits them here instead.
  """
  type ReportProblemConfig {
    categories: [ReportProblemCategory!]!
    message_label: String!
    message_hint: String!
    message_min_length: Int!
    allow_media: Boolean!
    max_media: Int!
  }

  input ReportProblemCategoryInput {
    key: String
    label: String!
    is_active: Boolean
    sort_order: Int
  }

  input UpdateReportProblemConfigInput {
    categories: [ReportProblemCategoryInput!]
    message_label: String
    message_hint: String
    message_min_length: Int
    allow_media: Boolean
    max_media: Int
  }

  extend type Query {
    "Support portal: every reported problem, newest first."
    reportedProblemsTable(query: TableQueryInput): FeedbackReportTablePage!
    reportedProblem(id: ID!): FeedbackReport
    "The Report a Problem form config. Readable by any signed-in user — the app renders from it."
    reportProblemConfig: ReportProblemConfig!
  }

  extend type Mutation {
    "Support portal: move a report through triage."
    setFeedbackReportStatus(id: ID!, status: FeedbackStatus!): FeedbackReport!
    "Support portal: edit the chips and prompt the app renders."
    updateReportProblemConfig(input: UpdateReportProblemConfigInput!): ReportProblemConfig!
  }
`;
