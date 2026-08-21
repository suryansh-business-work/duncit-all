export const reportTypeDefs = /* GraphQL */ `
  """
  What was reported.

  A story is the only surface that raises one today; the type exists so the
  next surface files into the same record and the same Legal queue rather than
  growing a second reports table.
  """
  enum ReportTargetType {
    STORY
    POST
    POD
    CLUB
    PROFILE
    PRODUCT
  }

  "Why the reporter says it should not be there."
  enum ReportReason {
    SPAM
    NUDITY
    VIOLENCE
    HATE
    HARASSMENT
    MISINFORMATION
    SCAM
    OTHER
  }

  "Where the Legal team has taken it."
  enum ReportStatus {
    RECEIVED
    IN_REVIEW
    ACTIONED
    DISMISSED
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
    reason: ReportReason!
    "The reporter's own words. Always present when the reason is OTHER."
    details: String!
    reporter_name: String!
    target_owner_name: String!
    status: ReportStatus!
    "What Legal did about it. Staff-only."
    resolution: String!
    resolved_at: String
    handled_by_name: String!
    created_at: String!
    updated_at: String!
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

  extend type Query {
    "Legal-only queue of everything users have reported."
    contentReportsTable(query: TableQueryInput): ContentReportTablePage!
    contentReport(id: ID!): ContentReport
    contentReportStats: ContentReportStats!
  }

  extend type Mutation {
    """
    Report a story. Open to any signed-in viewer — that is the point of it.

    The snapshot (media, caption, author, club) is taken server-side from the
    story itself, so a reporter cannot file a row describing something the
    story never showed.
    """
    reportStory(post_doc_id: ID!, reason: ReportReason!, details: String): ContentReport!
    updateContentReportStatus(id: ID!, input: UpdateContentReportStatusInput!): ContentReport!
  }
`;
