export const dnsTypeDefs = /* GraphQL */ `
  "Which stack a record answers for, read off its name: staging.* is the replica."
  enum DnsScope {
    PRODUCTION
    STAGING
  }

  "One record in the zone, as GoDaddy holds it."
  type DnsRecord {
    "type|name|value — unique in a zone, since GoDaddy refuses duplicates."
    id: String!
    "A, AAAA, CNAME, MX, TXT, CAA, NS, SOA or SRV. A string, so a type GoDaddy adds never fails the listing."
    type: String!
    "Relative to the domain: @ for the domain itself, shop for shop.<domain>."
    name: String!
    data: String!
    "Seconds."
    ttl: Int!
    "MX and SRV only."
    priority: Int
    "False for the types this console lists but never writes (NS, SOA, SRV)."
    editable: Boolean!
    scope: DnsScope!
  }

  "How many records of one type each stack holds."
  type DnsTypeGroup {
    type: String!
    total: Int!
    production: Int!
    staging: Int!
  }

  "What the two stacks hold for one host."
  enum DnsPairState {
    "Both stacks answer, with the same values."
    MATCHED
    "Production answers and staging does not — the staging URL resolves nowhere."
    MISSING_STAGING
    "Staging answers for a host production no longer has."
    MISSING_PRODUCTION
    "Both answer, at different addresses."
    VALUE_DIFFERS
  }

  "One host as production and staging each hold it."
  type DnsHostPair {
    "type|production name."
    id: String!
    type: String!
    "The production name, relative to the domain."
    name: String!
    host: String!
    staging_name: String!
    staging_host: String!
    production_values: [String!]!
    staging_values: [String!]!
    "The production TTL a sync would copy."
    ttl: Int
    state: DnsPairState!
    "Whether syncing can repair it — false with no production record to copy."
    fixable: Boolean!
  }

  "Staging beside production, host by host."
  type DnsStagingCompare {
    "Records counted across the paired types only."
    production_count: Int!
    staging_count: Int!
    matched: Int!
    missing_staging: Int!
    missing_production: Int!
    differs: Int!
    in_sync: Boolean!
    "The types that name a host, and so have a staging twin at all."
    paired_types: [String!]!
    pairs: [DnsHostPair!]!
  }

  "The DNS zone managed from Tech → Domain, and the rules its editor follows."
  type DnsZone {
    "Whether the default GoDaddy entry holds a key, a secret and a domain."
    configured: Boolean!
    domain: String!
    records: [DnsRecord!]!
    "Every record type in the zone, with its production and staging counts."
    by_type: [DnsTypeGroup!]!
    staging: DnsStagingCompare!
    writable_types: [String!]!
    min_ttl: Int!
    max_ttl: Int!
  }

  "A party on the domain's registrar record."
  type DnsDomainContact {
    "REGISTRANT, ADMIN, TECH or BILLING."
    role: String!
    name: String
    organization: String
    email: String
    phone: String
  }

  "The domain at the registrar — what decides whether the name resolves next year."
  type DnsDomainInfo {
    configured: Boolean!
    domain: String!
    domain_id: Int
    "GoDaddy's own status, e.g. ACTIVE."
    status: String
    expires_at: String
    created_at: String
    "Whole days until expiry. Negative once it has passed."
    days_to_expiry: Int
    renew_auto: Boolean
    "The last day GoDaddy will still renew it."
    renew_deadline: String
    renewable: Boolean
    "Registrar lock — a locked domain cannot be transferred away."
    locked: Boolean
    privacy: Boolean
    transfer_protected: Boolean
    expiration_protected: Boolean
    hold_registrar: Boolean
    name_servers: [String!]!
    contacts: [DnsDomainContact!]!
  }

  "What syncing one host onto staging did."
  type DnsSyncOutcome {
    id: String!
    host: String!
    ok: Boolean!
    "GoDaddy's reason, when it refused."
    message: String
  }

  type DnsSyncResult {
    synced: Int!
    failed: Int!
    outcomes: [DnsSyncOutcome!]!
  }

  input DnsRecordInput {
    type: String!
    name: String!
    data: String!
    ttl: Int!
    "Required for MX, ignored otherwise."
    priority: Int
  }

  "Which record a change is about: its values as the listing showed them."
  input DnsRecordRef {
    type: String!
    name: String!
    data: String!
  }

  extend type Query {
    "Every record in the configured GoDaddy zone, grouped and compared against staging."
    dnsZone: DnsZone!
    "The domain itself at GoDaddy: expiry, renewal and the locks on it."
    dnsDomainInfo: DnsDomainInfo!
  }

  extend type Mutation {
    addDnsRecord(input: DnsRecordInput!): Boolean!
    "Rewrites the value, TTL and priority of one record. Its type and name stay."
    updateDnsRecord(ref: DnsRecordRef!, input: DnsRecordInput!): Boolean!
    deleteDnsRecord(ref: DnsRecordRef!): Boolean!
    "Points the named staging hosts at whatever production holds. Never writes production."
    syncStagingDns(ids: [String!]!): DnsSyncResult!
  }
`;
