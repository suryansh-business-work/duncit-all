import gql from 'graphql-tag';

export const sslTypeDefs = gql`
  "How many hosts one certificate covers."
  enum SslCoverage {
    SINGLE
    MULTI
    WILDCARD
  }

  "One certbot lineage on the VPS, read from its public cert.pem and renewal conf."
  type SslCertificate {
    name: String!
    common_name: String
    domains: [String!]!
    coverage: SslCoverage!
    "RSA 2048, ECDSA prime256v1, ..."
    key_type: String!
    issuer: String
    serial_number: String!
    fingerprint_sha256: String!
    valid_from: String!
    valid_to: String!
    days_remaining: Int!
    "From this moment certbot's renewal timer will renew it."
    renewal_due_at: String!
    authenticator: String
    installer: String
    "False for a Let's Encrypt staging certificate, which browsers do not trust."
    production_ca: Boolean!
  }

  type SslOverview {
    "False when the host's certbot directory could not be read; error says why."
    available: Boolean!
    error: String
    certificates: [SslCertificate!]!
    checked_at: String!
  }

  "What one hostname on a certificate actually serves right now."
  type SslLiveCheck {
    domain: String!
    "False for a wildcard or a host outside duncit.com, which are not dialled."
    checked: Boolean!
    reachable: Boolean!
    trusted: Boolean!
    serving_this: Boolean!
    valid_to: String
    days_remaining: Int
    protocol: String
    error: String
  }

  extend type Query {
    "Tech > SSL: every certificate certbot holds on this VPS (SUPER_ADMIN / TECH_MANAGER)."
    sslCertificates: SslOverview!
    "Dial each host on one certificate and report the certificate it serves."
    sslLiveCheck(name: String!): [SslLiveCheck!]!
  }
`;
