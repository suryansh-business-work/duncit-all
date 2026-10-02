export const tableChangeLogTypeDefs = /* GraphQL */ `
  "One field of one record a portal table lists, changed once by a signed-in person."
  type TableChangeLog {
    id: ID!
    "The Mongo collection the record lives in."
    collection_name: String!
    "The record's id."
    doc_id: String!
    action: EntityChangeAction!
    "Document path of the field; empty on a CREATE or DELETE entry."
    field: String!
    old_value: String!
    new_value: String!
    actor_user_id: ID
    actor_name: String!
    actor_email: String!
    actor_roles: [String!]!
    source: EntityChangeSource!
    "The address and browser the change came from."
    ip: String!
    user_agent: String!
    created_at: String!
  }

  type TableChangeLogPage {
    rows: [TableChangeLog!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    """
    The change log of a portal table: every change a person made to the records
    that table shows the caller. The table is named by its <name>Table query and
    the variables (JSON text) its view sends; that read runs as the caller first,
    so its own access rules decide what history they may see.
    """
    tableChangeLogs(table: String!, variables: String!, query: TableQueryInput): TableChangeLogPage!
  }
`;
