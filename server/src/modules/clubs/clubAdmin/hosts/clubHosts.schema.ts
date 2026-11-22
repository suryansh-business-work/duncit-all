/**
 * Club Admin host management — its own module beside clubAdminTypeDefs (not
 * interpolated into it: the static schema check skips SDL with `${}`), in the
 * same MCP category ('clubs') and behind the same club-membership guard. Never public:
 * every field resolves through assertClubAdmin on the club it names.
 */
export const clubHostsTypeDefs = /* GraphQL */ `
  "One host of a club, as the club admin's Hosts table shows them."
  type ClubHostRow {
    user_id: ID!
    name: String!
    photo_url: String
    "Login phone, with its dialling code."
    phone: String
    "WhatsApp number when the host saved one."
    whatsapp: String
    email: String
    "Start of the host's latest completed pod in this club (ISO). Null when none has completed."
    last_pod_at: String
    days_since_last_pod: Int
    "Completed pods in this club this calendar month (admin time zone)."
    completed_this_month: Int!
    "Scheduled pods in this club still to start."
    upcoming_count: Int!
    "Pod Settings' monthly target."
    monthly_target: Int!
    "This month's Host Performance Score so far: min(100, completed / target x 100)."
    score: Int!
    "No completed pod in this club within Pod Settings' inactivity days — the row shows yellow."
    is_inactive: Boolean!
    "Score below Pod Settings' underperformance threshold."
    is_underperforming: Boolean!
    "The engagement status the club admin filed this host under (the first active status until they do)."
    engagement_status_key: String!
    engagement_status_label: String!
    engagement_note: String
    engagement_updated_at: String
  }

  "Server-side table page over a club's hosts (clubAdminClubHostsTable)."
  type ClubHostTablePage {
    rows: [ClubHostRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Counts over EVERY host of a club, for the Hosts page header and its inactive-hosts warning."
  type ClubHostsSummary {
    club_id: ID!
    club_name: String!
    host_count: Int!
    inactive_count: Int!
    underperforming_count: Int!
    inactivity_days: Int!
    monthly_pod_target: Int!
  }

  "One finished month of a host's performance in a club (from the monthly snapshot)."
  type HostScorePoint {
    "YYYY-MM."
    period: String!
    completed: Int!
    target: Int!
    score: Int!
  }

  "One host of a club in full, for the club admin's host page."
  type ClubHostDetail {
    user_id: ID!
    club_id: ID!
    club_name: String!
    name: String!
    photo_url: String
    phone: String
    whatsapp: String
    email: String
    last_pod_at: String
    days_since_last_pod: Int
    completed_this_month: Int!
    upcoming_count: Int!
    monthly_target: Int!
    score: Int!
    is_inactive: Boolean!
    is_underperforming: Boolean!
    inactivity_days: Int!
    engagement_status_key: String!
    engagement_status_label: String!
    engagement_note: String
    engagement_updated_at: String
    "Every configured status in order; only active ones may be picked."
    statuses: [HostEngagementStatus!]!
    "Up to six finished months, oldest first. Months before the first monthly run are absent."
    score_history: [HostScorePoint!]!
  }

  "The engagement status just saved."
  type ClubHostEngagementResult {
    host_user_id: ID!
    status_key: String!
    status_label: String!
    note: String
    updated_at: String!
  }

  extend type Query {
    "Hosts of one club the caller administers: contacts, last pod, this month's score, engagement status."
    clubAdminClubHostsTable(club_id: ID!, query: TableQueryInput): ClubHostTablePage!
    "Header counts for that table, over every host of the club."
    clubAdminClubHostsSummary(club_id: ID!): ClubHostsSummary!
    "One host of a club the caller administers. Null when the user does not host that club."
    clubAdminHostDetail(club_id: ID!, user_id: ID!): ClubHostDetail
  }

  extend type Mutation {
    """
    File a host of the caller's club under an engagement status (one of the
    active Pod Settings statuses), with an optional note. Refused for a user
    who does not host that club.
    """
    setClubHostEngagement(club_id: ID!, host_user_id: ID!, status_key: String!, note: String): ClubHostEngagementResult!
  }
`;
