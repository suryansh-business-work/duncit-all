export const userAuditTypeDefs = /* GraphQL */ `
  "What happened to the account (not to the individual field)."
  enum UserChangeAction {
    CREATE
    UPDATE
    DELETE
  }

  """
  Who made the change, relative to the account it changed. Editing your own
  profile is USER, editing someone else's is ADMIN, and a write with no
  signed-in caller (signup, webhook, background job) is SYSTEM.
  """
  enum UserChangeActorType {
    USER
    ADMIN
    SYSTEM
  }

  "Which surface the change was made from."
  enum UserChangeSource {
    NATIVE
    MWEB
    ADMIN_PORTAL
    PORTAL
    SERVER
  }

  "One immutable entry: one field of one user, changed once."
  type UserChangeLog {
    id: ID!
    "The account the change was made TO."
    user_id: ID!
    "Document path of the field, e.g. profile.first_name."
    field: String!
    "Human label for the same field, e.g. First Name."
    field_label: String!
    old_value: String!
    new_value: String!
    action: UserChangeAction!
    actor_type: UserChangeActorType!
    "The account that made the change; null for SYSTEM writes."
    actor_user_id: ID
    actor_name: String!
    source: UserChangeSource!
    "When the change was recorded."
    created_at: String!
  }

  "Server-side table page for the shared table engine."
  type UserChangeLogTablePage {
    rows: [UserChangeLog!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Admin: the complete profile change history of one user, newest first."
    userChangeLogsTable(user_id: ID!, query: TableQueryInput): UserChangeLogTablePage!
  }
`;
