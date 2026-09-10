export const entityAuditTypeDefs = /* GraphQL */ `
  "A directory record that carries a change log."
  enum EntityAuditType {
    VENUE
    HOST
    CLUB
    CLUB_ADMIN
    REGION
  }

  "What happened to the record (not to the individual field)."
  enum EntityChangeAction {
    CREATE
    UPDATE
    DELETE
  }

  """
  Who made the change, relative to the record it changed. The partner the
  record belongs to editing their own is OWNER, anybody else signed in is
  ADMIN, and a write with no signed-in caller (a sweep, a webhook, a boot task)
  is SYSTEM.
  """
  enum EntityChangeActorType {
    OWNER
    ADMIN
    SYSTEM
  }

  "Which surface the change was made from."
  enum EntityChangeSource {
    NATIVE
    MWEB
    ADMIN_PORTAL
    PORTAL
    SERVER
  }

  "One immutable entry: one field of one record, changed once."
  type EntityChangeLog {
    id: ID!
    entity_type: EntityAuditType!
    "The record the change was made TO."
    entity_id: ID!
    "Its name at the time, so a row still reads after a rename."
    entity_label: String!
    "Document path of the field, e.g. settings.rules.buffer_minutes."
    field: String!
    "Human label for the same field, e.g. Buffer Between Slots (min)."
    field_label: String!
    old_value: String!
    new_value: String!
    action: EntityChangeAction!
    actor_type: EntityChangeActorType!
    "The account that made the change; null for SYSTEM writes."
    actor_user_id: ID
    actor_name: String!
    source: EntityChangeSource!
    "When the change was recorded."
    created_at: String!
  }

  "Server-side table page for the shared table engine."
  type EntityChangeLogTablePage {
    rows: [EntityChangeLog!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "The complete change history of ONE directory record, newest first."
    entityChangeLogsTable(
      entity_type: EntityAuditType!
      entity_id: ID!
      query: TableQueryInput
    ): EntityChangeLogTablePage!
    "Every change across EVERY record of one entity — the console-wide feed."
    entityChangeFeedTable(
      entity_type: EntityAuditType!
      query: TableQueryInput
    ): EntityChangeLogTablePage!
  }
`;
