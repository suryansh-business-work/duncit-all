import gql from 'graphql-tag';

export const portalModeTypeDefs = gql`
  enum PortalModeKind {
    PORTAL
    WEBSITE
    APP
  }

  enum PortalModeState {
    LIVE
    MAINTENANCE
    DEVELOPMENT
  }

  type PortalMode {
    id: ID!
    key: String!
    name: String!
    kind: PortalModeKind!
    mode: PortalModeState!
    """
    Whether this console's header offers "Chat with a coworker" — the docked
    staff chat and its entry in the apps drawer.
    """
    chat_enabled: Boolean!
    "Whether this console's header offers the Apps drawer."
    apps_enabled: Boolean!
    note: String
    url: String
    updated_at: String
  }

  "Minimal shape every app polls publicly on load."
  type PortalModePublic {
    key: String!
    mode: PortalModeState!
    chat_enabled: Boolean!
    apps_enabled: Boolean!
  }

  "Server-side table page for the shared table engine (portalModesTable)."
  type PortalModeTablePage {
    rows: [PortalMode!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    portalModes: [PortalMode!]!
    portalModesTable(query: TableQueryInput): PortalModeTablePage!
    portalMode(key: String!): PortalModePublic!
  }

  extend type Mutation {
    setPortalMode(key: String!, mode: PortalModeState!, note: String): PortalMode!
    """
    Turn one console's header features on or off. Each flag is optional so a
    single switch can be flipped without restating the other.
    """
    setPortalAppFeatures(key: String!, chat_enabled: Boolean, apps_enabled: Boolean): PortalMode!
  }
`;
