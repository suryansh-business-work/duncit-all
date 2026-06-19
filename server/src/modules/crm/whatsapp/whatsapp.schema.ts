import gql from 'graphql-tag';

export const waLeadsTypeDefs = gql`
  enum WaStatus {
    DISCONNECTED
    CONNECTING
    CONNECTED
    ERROR
  }

  "Gateway connection config + live session status (the API key is never returned)."
  type WaConnection {
    base_url: String!
    session_id: String!
    has_api_key: Boolean!
    status: WaStatus!
    phone: String
    last_error: String
    connected_at: String
  }

  type WaQr {
    qr_code: String
    status: WaStatus!
  }

  "Result of generating a fresh gateway API key (the key is returned once)."
  type WaGeneratedKey {
    api_key: String!
    connection: WaConnection!
  }

  input WaConfigInput {
    base_url: String
    api_key: String
    session_id: String
  }

  type WaCommunity {
    id: ID!
    community_jid: String!
    name: String!
    groups_count: Int!
  }

  type WaGroup {
    id: ID!
    group_jid: String!
    name: String!
    community_jid: String
    members_count: Int!
  }

  type WaContact {
    id: ID!
    contact_jid: String!
    phone: String!
    name: String!
    push_name: String
    is_business: Boolean!
  }

  type WaMember {
    jid: String!
    phone: String!
    name: String!
    is_business: Boolean!
  }

  type WaSourceRef {
    jid: String!
    name: String!
  }

  type WaUserLead {
    id: ID!
    phone: String!
    name: String!
    contact_jid: String
    source_account: String
    source_communities: [WaSourceRef!]!
    source_groups: [WaSourceRef!]!
    imported_at: String
  }

  type WaSyncResult {
    communities: Int!
    groups: Int!
    contacts: Int!
    leads: Int!
  }

  type WaImportResult {
    imported: Int!
    skipped: Int!
  }

  input WaCreateUserLeadInput {
    phone: String!
    name: String
    source_account: String
  }

  extend type Query {
    "Stored gateway config + last-known status (no network call)."
    waConnection: WaConnection!
    "Refreshes the session status from the gateway, then returns it."
    waStatus: WaConnection!
    "Current QR data URL to scan + session status."
    waQr: WaQr!
    "Cached communities (Mongo-first)."
    waCommunities: [WaCommunity!]!
    "Cached groups, optionally filtered to one community."
    waGroups(community_jid: String): [WaGroup!]!
    "Cached contacts (optional name/phone search)."
    waContacts(search: String): [WaContact!]!
    "Generated user leads (optional name/phone search)."
    waUserLeads(search: String): [WaUserLead!]!
    waUserLead(id: ID!): WaUserLead
    "Live-fetch a group's members (also imports them as leads)."
    waGroupMembers(group_jid: String!): [WaMember!]!
    "Export user leads as a base64 .xlsx (optionally filtered by search)."
    waExportUserLeads(search: String): String!
  }

  extend type Mutation {
    waSaveConfig(input: WaConfigInput!): WaConnection!
    "Mint a dedicated gateway API key from your master/admin key and save it."
    waGenerateApiKey(base_url: String!, master_key: String!): WaGeneratedKey!
    "Create/start the session so a QR can be scanned."
    waConnect: WaConnection!
    waDisconnect: WaConnection!
    "Pull latest communities/groups/contacts from the gateway into the cache."
    waRefresh: WaSyncResult!
    "Manually create (or upsert) a single user lead."
    waCreateUserLead(input: WaCreateUserLeadInput!): WaUserLead!
    "Import user leads from an uploaded .xlsx/.csv (base64)."
    waImportUserLeads(file_base64: String!): WaImportResult!
  }
`;
