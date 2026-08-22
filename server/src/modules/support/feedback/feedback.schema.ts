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
    "Null when the report arrived by email from an address with no account."
    user_id: ID
    user_name: String!
    user_email: String!
    category: String!
    message: String!
    "Screenshots the reporter attached."
    media_urls: [String!]!
    """
    The reporter as they were WHEN they reported it — a snapshot, not a join.
    Support reads these days later, by which time the account may have changed
    phone, city or roles; user_id is still here for when the CURRENT state is
    what matters instead.
    """
    reporter_phone: String!
    reporter_city: String!
    reporter_locale: String!
    reporter_roles: [String!]!
    platform: String!
    app_version: String!
    "What they were running it on — a report without the device cannot be reproduced."
    device_os: String!
    device_model: String!
    "The screen they were on when they opened the form."
    source_screen: String!
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

  """
  Where a reported problem is announced on Slack.

  Deliberately NOT part of ReportProblemConfig: that one is readable by every
  signed-in user because the app renders its form from it, and the workspace's
  channel list is not theirs to see.
  """
  type ReportProblemSlackSettings {
    "False when no Slack bot token is configured — nothing can be announced then."
    slack_configured: Boolean!
    "Whether a new report is announced on Slack at all. Off still files the report."
    enabled: Boolean!
    "Channel the announcement is posted to. Empty falls back to the Tech portal's feedback / default channel."
    channel_id: String!
    """
    The channel's name as it read when it was picked — display only, so this
    page can still name a channel the bot has since lost sight of.
    """
    channel_name: String!
    "Channels the bot can see, to pick from. Empty when Slack is unconfigured or unreachable."
    channels: [SlackChannel!]!
    "Why the channel list could not be read, when it could not. Empty otherwise."
    error: String!
  }

  input UpdateReportProblemSlackInput {
    enabled: Boolean
    "Channel ID (e.g. C0123ABCD). Empty falls back to the configured feedback / default channel."
    channel_id: String
    "The channel's name as shown when it was picked."
    channel_name: String
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
    "Support portal: where reports are announced on Slack, and the channels to choose from."
    reportProblemSlackSettings: ReportProblemSlackSettings!
  }

  extend type Mutation {
    "Support portal: move a report through triage."
    setFeedbackReportStatus(id: ID!, status: FeedbackStatus!): FeedbackReport!
    "Support portal: edit the chips and prompt the app renders."
    updateReportProblemConfig(input: UpdateReportProblemConfigInput!): ReportProblemConfig!
    "Support portal: choose whether reports are announced on Slack, and where."
    updateReportProblemSlack(input: UpdateReportProblemSlackInput!): ReportProblemSlackSettings!
  }
`;
