export const cloudflareTypeDefs = /* GraphQL */ `
  "Where one record lives across the two providers."
  enum CloudflareRowState {
    "On GoDaddy and Cloudflare, with the same value."
    BOTH
    "On GoDaddy only — it stops resolving if the nameservers move now."
    GODADDY_ONLY
    "On Cloudflare only — it starts resolving when the nameservers move."
    CLOUDFLARE_ONLY
  }

  "Which provider the registrar sends resolvers to today."
  enum DnsLiveProvider {
    GODADDY
    CLOUDFLARE
    "Nameservers that are neither GoDaddy's nor this Cloudflare zone's."
    OTHER
    "GoDaddy reported no nameservers."
    UNKNOWN
  }

  "Where a nameserver switch points the domain."
  enum NameServerTarget {
    "The two nameservers Cloudflare assigned this zone."
    CLOUDFLARE
    "GoDaddy's own nameservers, read from the NS records its zone still holds."
    GODADDY
    "Nameservers typed by hand."
    CUSTOM
  }

  "The domain's zone on Cloudflare."
  type CloudflareZoneInfo {
    id: String!
    "pending until Cloudflare sees its nameservers at the registrar, then active."
    status: String!
    paused: Boolean!
    "The pair Cloudflare assigned — what the registrar must point at."
    name_servers: [String!]!
    activated_on: String
  }

  "One record, as GoDaddy and Cloudflare each hold it."
  type CloudflareCompareRow {
    "type|name|value|priority."
    id: String!
    type: String!
    "Relative to the domain: @ for the domain itself."
    name: String!
    host: String!
    "MX and SRV only."
    priority: Int
    godaddy_value: String
    cloudflare_value: String
    "Whether Cloudflare proxies it. Null when Cloudflare has no record here."
    proxied: Boolean
    state: CloudflareRowState!
    "Whether copying it to Cloudflare can fix it."
    copyable: Boolean!
  }

  "The move from GoDaddy DNS to Cloudflare: both zones side by side and where the domain points now."
  type CloudflareMigration {
    godaddy_configured: Boolean!
    cloudflare_configured: Boolean!
    "Both configured, for the same domain."
    connected: Boolean!
    domain: String!
    "The domain the Cloudflare entry names — shown when it differs from GoDaddy's."
    cloudflare_domain: String!
    "Null until the domain has been added to Cloudflare."
    zone: CloudflareZoneInfo
    rows: [CloudflareCompareRow!]!
    matched: Int!
    godaddy_only: Int!
    cloudflare_only: Int!
    "What the registrar points at today."
    current_name_servers: [String!]!
    "GoDaddy's own nameservers for this domain — what switching back restores."
    godaddy_name_servers: [String!]!
    live_provider: DnsLiveProvider!
    "The zone exists and every GoDaddy record is already on Cloudflare."
    ready_to_switch: Boolean!
  }

  extend type Query {
    "GoDaddy's zone beside Cloudflare's, and the nameservers the domain uses today."
    cloudflareMigration: CloudflareMigration!
  }

  extend type Mutation {
    "Adds the domain to Cloudflare as a full-setup zone. Does nothing when it is already there."
    createCloudflareZone: Boolean!
    "Copies the named GoDaddy-only records onto Cloudflare, DNS-only. Never writes GoDaddy."
    copyDnsToCloudflare(ids: [String!]!): DnsSyncResult!
    "Removes one record from Cloudflare. GoDaddy is untouched."
    deleteCloudflareDnsRecord(id: String!): Boolean!
    "Asks Cloudflare to re-check the domain's nameservers now."
    checkCloudflareActivation: Boolean!
    "Points the domain at new nameservers at GoDaddy. name_servers is read only for CUSTOM."
    setDomainNameServers(target: NameServerTarget!, name_servers: [String!]): Boolean!
  }
`;
