export const podAuditTypeDefs = /* GraphQL */ `
  "What kind of pod action was recorded."
  enum PodAuditAction {
    CREATE
    UPDATE
    RESUBMIT
    DELETE
    VENUE_APPROVED
    VENUE_DECLINED
    COMPLETE
  }

  "Which surface performed the action."
  enum PodAuditSource {
    ADMIN
    CLUB_ADMIN
    HOST
    VENUE_OWNER
    SYSTEM
  }

  "AI risk verdict for a recorded action (PENDING until the review lands)."
  enum PodAuditRisk {
    PENDING
    LOW
    MEDIUM
    HIGH
  }

  "One changed field of a recorded pod edit."
  type PodAuditChange {
    field: String!
    from: String!
    to: String!
  }

  "One immutable AI-monitored audit entry for a pod action."
  type PodAuditLog {
    id: ID!
    pod_id: ID!
    pod_title: String!
    club_id: ID
    actor_user_id: ID
    actor_name: String!
    source: PodAuditSource!
    action: PodAuditAction!
    changes: [PodAuditChange!]!
    "Free-text context (delete reason, venue decline reason, …)."
    note: String!
    ai_risk: PodAuditRisk!
    ai_summary: String!
    ai_reviewed_at: String
    created_at: String!
  }

  "Server-side table page for the shared table engine (podAuditLogsTable)."
  type PodAuditLogTablePage {
    rows: [PodAuditLog!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Admin: AI-monitored audit trail of every pod action."
    podAuditLogsTable(query: TableQueryInput): PodAuditLogTablePage!
    "Club admin: the same trail scoped to the clubs the caller administers."
    clubAdminPodAuditLogsTable(query: TableQueryInput): PodAuditLogTablePage!
    "Full trail of one pod, newest first (admin)."
    podAuditLogs(pod_doc_id: ID!): [PodAuditLog!]!
  }
`;
