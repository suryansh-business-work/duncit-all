import gql from 'graphql-tag';

export const envEntryTypeDefs = gql`
  enum EnvCategory {
    EMAIL
    IMAGEKIT
    PEXELS
    GOOGLE
    TWILIO
    AI
    VOBIZ
  }

  type EnvConfigPair {
    key: String!
    value: String!
  }

  type EnvSecretFlag {
    key: String!
    present: Boolean!
  }

  "A category field definition so the UI can render the right inputs dynamically."
  type EnvFieldDef {
    name: String!
    label: String!
    secret: Boolean!
    number: Boolean!
    bool: Boolean!
  }

  type EnvCategoryDef {
    category: EnvCategory!
    label: String!
    fields: [EnvFieldDef!]!
  }

  type EnvEntry {
    id: ID!
    name: String!
    category: EnvCategory!
    description: String
    is_default: Boolean!
    is_active: Boolean!
    assigned_portals: [String!]!
    config: [EnvConfigPair!]!
    secrets: [EnvSecretFlag!]!
    last_used_at: String
    created_at: String
    updated_at: String
  }

  input EnvConfigPairInput {
    key: String!
    value: String!
  }

  input CreateEnvEntryInput {
    name: String!
    category: EnvCategory!
    description: String
    is_default: Boolean
    is_active: Boolean
    config: [EnvConfigPairInput!]
    assigned_portals: [String!]
  }

  input UpdateEnvEntryInput {
    name: String
    description: String
    is_default: Boolean
    is_active: Boolean
    config: [EnvConfigPairInput!]
    assigned_portals: [String!]
  }

  input EnvEntryFilter {
    category: EnvCategory
    is_active: Boolean
  }

  type EnvTestResult {
    ok: Boolean!
    message: String!
  }

  extend type Query {
    envEntries(filter: EnvEntryFilter): [EnvEntry!]!
    envEntry(id: ID!): EnvEntry
    envCategories: [EnvCategoryDef!]!
    "Entries currently assigned to a portal (by portal key)."
    envEntriesForPortal(portalKey: String!): [EnvEntry!]!
  }

  extend type Mutation {
    createEnvEntry(input: CreateEnvEntryInput!): EnvEntry!
    updateEnvEntry(id: ID!, input: UpdateEnvEntryInput!): EnvEntry!
    deleteEnvEntry(id: ID!): Boolean!
    setDefaultEnvEntry(id: ID!): EnvEntry!
    testEnvEntry(id: ID!): EnvTestResult!
    "Replace the full set of entries assigned to a portal."
    setPortalEnvEntries(portalKey: String!, entryIds: [ID!]!): [EnvEntry!]!
  }
`;
