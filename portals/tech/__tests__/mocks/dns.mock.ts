/**
 * Plain-object fixtures for the Domain consoles. They are deliberately loose
 * (the generated GraphQL types are wide and optional-heavy), carrying exactly
 * the fields the pages read.
 */
export const dnsRecord = (over: Record<string, unknown> = {}) => ({
  __typename: 'DnsRecord',
  id: 'r1',
  type: 'A',
  name: 'api',
  data: '203.0.113.10',
  ttl: 600,
  priority: null,
  editable: true,
  scope: 'PRODUCTION',
  ...over,
});

export const dnsPair = (over: Record<string, unknown> = {}) => ({
  __typename: 'DnsHostPair',
  id: 'p1',
  type: 'A',
  name: 'api',
  host: 'api.example.test',
  staging_name: 'api-staging',
  staging_host: 'api-staging.example.test',
  production_values: ['203.0.113.10'],
  staging_values: ['203.0.113.10'],
  ttl: 600,
  state: 'MATCHED',
  fixable: false,
  ...over,
});

export const dnsZone = (over: Record<string, unknown> = {}) => ({
  __typename: 'DnsZone',
  configured: true,
  domain: 'example.test',
  writable_types: ['A', 'AAAA', 'CNAME', 'MX', 'TXT'],
  min_ttl: 600,
  max_ttl: 86400,
  records: [
    dnsRecord(),
    dnsRecord({ id: 'r2', type: 'MX', name: '@', data: 'mail.example.test', priority: 10 }),
    dnsRecord({ id: 'r3', type: 'NS', name: '@', data: 'ns1.example.test', editable: false }),
    dnsRecord({ id: 'r4', type: 'A', name: 'api-staging', scope: 'STAGING' }),
  ],
  by_type: [
    { type: 'A', total: 2, production: 1, staging: 1 },
    { type: 'MX', total: 1, production: 1, staging: 0 },
    { type: 'NS', total: 1, production: 1, staging: 0 },
  ],
  staging: {
    production_count: 3,
    staging_count: 2,
    matched: 1,
    missing_staging: 1,
    missing_production: 1,
    differs: 1,
    in_sync: false,
    paired_types: ['A', 'MX'],
    pairs: [
      dnsPair(),
      dnsPair({ id: 'p2', name: 'www', host: 'www.example.test', staging_values: [], state: 'MISSING_STAGING', fixable: true }),
      dnsPair({ id: 'p3', name: 'app', host: 'app.example.test', staging_values: ['198.51.100.1'], state: 'VALUE_DIFFERS', fixable: true }),
      dnsPair({ id: 'p4', name: 'old', host: 'old.example.test', production_values: [], state: 'MISSING_PRODUCTION', fixable: false }),
    ],
  },
  ...over,
});

export const domainInfo = (over: Record<string, unknown> = {}) => ({
  __typename: 'DnsDomainInfo',
  configured: true,
  domain: 'example.test',
  domain_id: 1234,
  status: 'ACTIVE',
  expires_at: '2027-01-01T00:00:00.000Z',
  created_at: '2020-01-01T00:00:00.000Z',
  days_to_expiry: 200,
  renew_auto: true,
  renew_deadline: '2027-02-01T00:00:00.000Z',
  renewable: true,
  locked: true,
  privacy: true,
  transfer_protected: false,
  expiration_protected: null,
  hold_registrar: false,
  name_servers: ['ns1.example.test', 'ns2.example.test'],
  contacts: [
    { role: 'REGISTRANT', name: 'Ops Team', organization: 'Example Org', email: 'ops@example.test', phone: null },
    { role: 'CUSTOM', name: null, organization: null, email: null, phone: null },
  ],
  ...over,
});
