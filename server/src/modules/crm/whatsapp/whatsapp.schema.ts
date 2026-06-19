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

  "Server-side pagination / search / sort options for the cache lists."
  input WaPageInput {
    search: String
    page: Int
    page_size: Int
    sort_by: String
    sort_dir: String
    community_jid: String
  }

  type WaCommunity {
    id: ID!
    community_jid: String!
    name: String!
    groups_count: Int!
  }
  type WaCommunityPage {
    items: [WaCommunity!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type WaGroup {
    id: ID!
    group_jid: String!
    name: String!
    community_jid: String
    members_count: Int!
  }
  type WaGroupPage {
    items: [WaGroup!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type WaContact {
    id: ID!
    contact_jid: String!
    phone: String!
    name: String!
    push_name: String
    is_business: Boolean!
  }
  type WaContactPage {
    items: [WaContact!]!
    total: Int!
    page: Int!
    page_size: Int!
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
  type WaUserLeadPage {
    items: [WaUserLead!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Top-of-page dashboard counters."
  type WaLeadStats {
    total_leads: Int!
    total_communities: Int!
    total_groups: Int!
    total_contacts: Int!
  }

  type WaSyncResult {
    communities: Int!
    groups: Int!
    contacts: Int!
    leads: Int!
    valid: Int!
    invalid: Int!
    duplicates: Int!
  }

  "Background extraction job — live progress + quality breakdown."
  type WaExtraction {
    id: ID!
    status: String!
    phase: String!
    total: Int!
    processed: Int!
    valid: Int!
    invalid: Int!
    duplicates: Int!
    communities: Int!
    groups: Int!
    leads_created: Int!
    error: String
    started_at: String
    finished_at: String
  }

  type WaImportResult {
    imported: Int!
    duplicates: Int!
    skipped: Int!
  }

  "Result of a database-level cleanup."
  type WaCleanResult {
    removed_invalid: Int!
    removed_duplicates: Int!
    removed_contacts: Int!
    remaining: Int!
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
    "Dashboard counters (leads / communities / groups / contacts)."
    waLeadStats: WaLeadStats!
    "Cached communities (paginated + searchable)."
    waCommunities(input: WaPageInput): WaCommunityPage!
    "Cached groups (paginated, searchable, filterable by community)."
    waGroups(input: WaPageInput): WaGroupPage!
    "Cached contacts (paginated + searchable)."
    waContacts(input: WaPageInput): WaContactPage!
    "Generated user leads (paginated, searchable, sortable)."
    waUserLeads(input: WaPageInput): WaUserLeadPage!
    waUserLead(id: ID!): WaUserLead
    "Live-fetch a group's members (also imports them as leads)."
    waGroupMembers(group_jid: String!): [WaMember!]!
    "Export user leads as a base64 .xlsx (optionally filtered by search)."
    waExportUserLeads(search: String): String!
    "Latest background extraction job (for progress polling)."
    waExtraction: WaExtraction
  }

  extend type Mutation {
    waSaveConfig(input: WaConfigInput!): WaConnection!
    "Mint a dedicated gateway API key from your master/admin key and save it."
    waGenerateApiKey(base_url: String!, master_key: String!): WaGeneratedKey!
    "Create/start the session so a QR can be scanned."
    waConnect: WaConnection!
    waDisconnect: WaConnection!
    "Synchronous pull of latest communities/groups/contacts into the cache."
    waRefresh: WaSyncResult!
    "Start a non-blocking background extraction; poll waExtraction for progress."
    waStartExtraction: WaExtraction!
    "Cancel the running extraction job."
    waCancelExtraction: WaExtraction
    "Database cleanup: drop invalid-phone records + de-duplicate leads."
    waCleanData: WaCleanResult!
    "Manually create (or upsert) a single user lead."
    waCreateUserLead(input: WaCreateUserLeadInput!): WaUserLead!
    "Import user leads from an uploaded .xlsx/.csv (base64)."
    waImportUserLeads(file_base64: String!): WaImportResult!
  }
`;
