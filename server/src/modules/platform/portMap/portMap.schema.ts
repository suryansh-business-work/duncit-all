import gql from 'graphql-tag';

export const portMapTypeDefs = gql`
  "One file in the host's nginx sites-available."
  type PortMapSite {
    name: String!
    "Linked into sites-enabled, so nginx actually serves it."
    enabled: Boolean!
    domain_count: Int!
  }

  "One domain + location that nginx proxies to a local address."
  type PortMapRoute {
    site: String!
    enabled: Boolean!
    domain: String!
    location: String!
    "The proxy_pass target exactly as written."
    target: String!
    host: String
    "Null for a unix socket or a target built from variables."
    port: Int
    "Some server block for this domain listens on 443 / ssl."
    tls: Boolean!
  }

  type PortMapOverview {
    "False when the host's nginx directory could not be read; error says why."
    available: Boolean!
    error: String
    sites: [PortMapSite!]!
    routes: [PortMapRoute!]!
    checked_at: String!
  }

  extend type Query {
    "Tech > Domain > Port Mapping: domain to port routes from nginx sites-available (SUPER_ADMIN / TECH_MANAGER)."
    portMappings: PortMapOverview!
  }
`;
