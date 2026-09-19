export const dnsTypeDefs = /* GraphQL */ `
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
  }

  "The DNS zone managed from Tech → DNS Config, and the rules its editor follows."
  type DnsZone {
    "Whether the default GoDaddy entry holds a key, a secret and a domain."
    configured: Boolean!
    domain: String!
    records: [DnsRecord!]!
    writable_types: [String!]!
    min_ttl: Int!
    max_ttl: Int!
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
    "Every record in the configured GoDaddy zone."
    dnsZone: DnsZone!
  }

  extend type Mutation {
    addDnsRecord(input: DnsRecordInput!): Boolean!
    "Rewrites the value, TTL and priority of one record. Its type and name stay."
    updateDnsRecord(ref: DnsRecordRef!, input: DnsRecordInput!): Boolean!
    deleteDnsRecord(ref: DnsRecordRef!): Boolean!
  }
`;
