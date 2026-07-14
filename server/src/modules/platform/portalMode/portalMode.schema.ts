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
    note: String
    url: String
    updated_at: String
  }

  "Minimal shape every app polls publicly on load."
  type PortalModePublic {
    key: String!
    mode: PortalModeState!
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
  }
`;
