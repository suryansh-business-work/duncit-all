export const reportTypeDefs = /* GraphQL */ `
  """
  What was reported.

  Posts and stories raise one today; the type exists so the next surface files
  into the same record and the same Legal queue rather than growing a second
  reports table.
  """
  enum ReportTargetType {
    STORY
    POST
    POD
    CLUB
    PROFILE
    PRODUCT
  }

  "Where the Legal team has taken it."
  enum ReportStatus {
    RECEIVED
    IN_REVIEW
    ACTIONED
    DISMISSED
  }

  "Something a reviewer did to a report."
  enum ReportActionType {
    TAKEN_DOWN
    LOOKS_GOOD
    MAIL_REPORTER
    MAIL_OWNER
    STATUS_CHANGED
  }

  "Who a reviewer is writing to about a report."
  enum ReportMailRecipient {
    "The person who filed the report."
    REPORTER
    "The person whose content was reported."
    OWNER
  }

  """
  A reason a person can pick when reporting content.

  Managed in Legal > UGC Monitoring > Settings. The report dialog on mWeb and
  the native app renders the active ones, so a new category needs no release.
  """
  type ReportCategory {
    id: ID!
    "Immutable handle stored on each report, e.g. COPYRIGHT."
    key: String!
    label: String!
    "Optional line under the label saying what belongs in this category."
    description: String!
    "True when the reporter must describe the problem in their own words."
    requires_details: Boolean!
    sort_order: Int!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  type ReportCategoryTablePage {
    rows: [ReportCategory!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input ReportCategoryInput {
    label: String
    description: String
    requires_details: Boolean
    sort_order: Int
    is_active: Boolean
  }

  "One entry in a report's staff-only activity log."
  type ContentReportAction {
    id: ID!
    action: ReportActionType!
    by_name: String!
    at: String!
    "The reviewer's note, or the message that was mailed."
    note: String!
  }

  type ContentReport {
    id: ID!
    "Permanent, globally unique handle (RPT-000001). Never edited, never reused."
    report_no: String!
    target_type: ReportTargetType!
    target_id: ID!
    club_id: ID
    """
    What the reporter was looking at, copied at report time.

    A story is gone in 24 hours and a reported post is the first thing its
    author deletes, so the row would otherwise point at nothing by the time
    anyone reviewed it.
    """
    target_preview_url: String!
    target_caption: String!
    "The key of the report category the reporter picked."
    reason: String!
    "That category's current name; the key itself when the category is gone."
    reason_label: String!
    "The reporter's own words. Always present when the category requires them."
    details: String!
    reporter_name: String!
    target_owner_name: String!
    status: ReportStatus!
    "What Legal did about it. Staff-only."
    resolution: String!
    resolved_at: String
    handled_by_name: String!
    "True while the reported content is still up for everyone to see."
    target_live: Boolean!
    "When Legal took the content down. Null if it was never taken down by us."
    target_removed_at: String
    "How many different people reported this same piece of content."
    report_count: Int!
    history: [ContentReportAction!]!
    created_at: String!
    updated_at: String!
  }

  "What a reporter gets back: proof the report was filed, and nothing staff-only."
  type ContentReportReceipt {
    id: ID!
    report_no: String!
  }

  type ContentReportTablePage {
    rows: [ContentReport!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type ReportStatusCount {
    status: ReportStatus!
    count: Int!
  }

  type ContentReportStats {
    total: Int!
    by_status: [ReportStatusCount!]!
  }

  input UpdateContentReportStatusInput {
    status: ReportStatus
    resolution: String
  }

  input ContentReportMailInput {
    recipient: ReportMailRecipient!
    subject: String!
    message: String!
  }

  extend type Query {
    "The categories the report dialog offers — active ones, in Legal's order."
    reportCategories: [ReportCategory!]!
    "Legal-only: every category, for the UGC Monitoring settings table."
    reportCategoriesTable(query: TableQueryInput): ReportCategoryTablePage!
    "Legal-only queue of everything users have reported."
    contentReportsTable(query: TableQueryInput): ContentReportTablePage!
    contentReport(id: ID!): ContentReport
    contentReportStats: ContentReportStats!
  }

  extend type Mutation {
    """
    Report a post or a story. Open to any signed-in viewer — that is the point.

    The reason is a report category key. The snapshot (media, caption, author,
    club) is taken server-side from the post itself, so a reporter cannot file a
    row describing something it never showed.
    """
    reportPost(post_doc_id: ID!, reason: String!, details: String): ContentReportReceipt!
    """
    Report a member's profile. Files into the same Legal queue as posts, with
    the avatar, name, @handle and bio snapshotted server-side.
    """
    reportProfile(user_id: ID!, reason: String!, details: String): ContentReportReceipt!
    updateContentReportStatus(id: ID!, input: UpdateContentReportStatusInput!): ContentReport!
    """
    Remove the reported content for everyone and close every open report on it
    as ACTIONED. Cannot be undone.
    """
    takeDownReportedContent(id: ID!, note: String): ContentReport!
    "The content is fine: close every open report on it as DISMISSED."
    markReportedContentOk(id: ID!, note: String): ContentReport!
    "Write to the reporter or to the content's owner about this report."
    sendContentReportMail(id: ID!, input: ContentReportMailInput!): ContentReport!
    createReportCategory(input: ReportCategoryInput!): ReportCategory!
    updateReportCategory(id: ID!, input: ReportCategoryInput!): ReportCategory!
    deleteReportCategory(id: ID!): Boolean!
  }
`;
