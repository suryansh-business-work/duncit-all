/**
 * dnsService: the zone listing, the registrar summary, and the validation and
 * set arithmetic behind add / update / delete. GoDaddy is mocked at the
 * gateway; the staging comparison runs for real on the mocked records.
 */
jest.mock('@observability/log', () => ({
  logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
}));
jest.mock('../../godaddy.gateway', () => ({
  godaddyAddRecords: jest.fn(),
  godaddyConfig: jest.fn(),
  godaddyDeleteSet: jest.fn(),
  godaddyDomain: jest.fn(),
  godaddyRecords: jest.fn(),
  godaddyRecordSet: jest.fn(),
  godaddyReplaceSet: jest.fn(),
  requireGodaddyConfig: jest.fn(),
}));

import { logs } from '@observability/log';
import {
  godaddyAddRecords,
  godaddyConfig,
  godaddyDeleteSet,
  godaddyDomain,
  godaddyRecords,
  godaddyRecordSet,
  godaddyReplaceSet,
  requireGodaddyConfig,
  type GodaddyRecord,
} from '../../godaddy.gateway';
import { stagingCompare } from '../../dns.compare';
import { dnsService, type DnsRecordInput } from '../../dns.service';

const cfg = { apiKey: 'test-key', apiSecret: 'test-secret', domain: 'example.com' };
const BY = 'ops@example.com';

const mock = (fn: unknown) => fn as jest.Mock;

const aRecord = (overrides: Partial<DnsRecordInput> = {}): DnsRecordInput => ({
  type: 'A',
  name: 'shop',
  data: '203.0.113.10',
  ttl: 600,
  ...overrides,
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-01T00:00:00Z'));
  mock(godaddyConfig).mockResolvedValue(cfg);
  mock(requireGodaddyConfig).mockResolvedValue(cfg);
  mock(godaddyAddRecords).mockResolvedValue(undefined);
  mock(godaddyReplaceSet).mockResolvedValue(undefined);
  mock(godaddyDeleteSet).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('zone', () => {
  it('answers "not configured" with the editor rules instead of failing', async () => {
    mock(godaddyConfig).mockResolvedValue(null);
    await expect(dnsService.zone()).resolves.toEqual({
      configured: false,
      domain: '',
      records: [],
      by_type: [],
      staging: stagingCompare([], ''),
      writable_types: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'CAA'],
      min_ttl: 600,
      max_ttl: 604_800,
    });
    expect(godaddyRecords).not.toHaveBeenCalled();
  });

  it('lists every record with an id, scope and whether this console may edit it', async () => {
    const records: GodaddyRecord[] = [
      { type: 'A', name: '@', data: '203.0.113.1', ttl: 600 },
      { type: 'A', name: 'staging', data: '203.0.113.2', ttl: 600 },
      { type: 'MX', name: '@', data: 'mx.example.com', ttl: 3600, priority: 10 },
      { type: 'NS', name: '@', data: 'ns1.example.net', ttl: 3600 },
    ];
    mock(godaddyRecords).mockResolvedValue(records);

    const zone = await dnsService.zone();
    expect(godaddyRecords).toHaveBeenCalledWith(cfg);
    expect(zone.configured).toBe(true);
    expect(zone.domain).toBe('example.com');
    expect(zone.records).toEqual([
      { id: 'A|@|203.0.113.1', type: 'A', name: '@', data: '203.0.113.1', ttl: 600, priority: null, editable: true, scope: 'PRODUCTION' },
      { id: 'A|staging|203.0.113.2', type: 'A', name: 'staging', data: '203.0.113.2', ttl: 600, priority: null, editable: true, scope: 'STAGING' },
      { id: 'MX|@|mx.example.com', type: 'MX', name: '@', data: 'mx.example.com', ttl: 3600, priority: 10, editable: true, scope: 'PRODUCTION' },
      { id: 'NS|@|ns1.example.net', type: 'NS', name: '@', data: 'ns1.example.net', ttl: 3600, priority: null, editable: false, scope: 'PRODUCTION' },
    ]);
    expect(zone.staging).toEqual(stagingCompare(records, 'example.com'));
    expect(zone.by_type.length).toBeGreaterThan(0);
  });
});

describe('domain', () => {
  it('answers "not configured" without calling the registrar', async () => {
    mock(godaddyConfig).mockResolvedValue(null);
    await expect(dnsService.domain()).resolves.toEqual({ configured: false, domain: '', name_servers: [], contacts: [] });
    expect(godaddyDomain).not.toHaveBeenCalled();
  });

  it('flattens the registrar record, counts days to expiry and keeps only filled contacts', async () => {
    mock(godaddyDomain).mockResolvedValue({
      domainId: 42,
      domain: 'example.com',
      status: 'ACTIVE',
      expires: '2026-09-11T12:00:00Z',
      createdAt: '2020-01-01T00:00:00Z',
      renewAuto: true,
      renewDeadline: '2026-10-26T00:00:00Z',
      renewable: true,
      locked: true,
      privacy: false,
      transferProtected: true,
      expirationProtected: false,
      holdRegistrar: false,
      nameServers: ['ns1.example.net', 'ns2.example.net'],
      contactRegistrant: { nameFirst: 'Ada', nameLast: 'Lovelace', organization: 'Example Ltd', email: 'ada@example.com', phone: '+1.5550100' },
      contactAdmin: { organization: 'Example Ltd' },
      contactTech: { email: 'tech@example.com' },
      contactBilling: {},
    });

    await expect(dnsService.domain()).resolves.toEqual({
      configured: true,
      domain: 'example.com',
      domain_id: 42,
      status: 'ACTIVE',
      expires_at: '2026-09-11T12:00:00Z',
      created_at: '2020-01-01T00:00:00Z',
      days_to_expiry: 11,
      renew_auto: true,
      renew_deadline: '2026-10-26T00:00:00Z',
      renewable: true,
      locked: true,
      privacy: false,
      transfer_protected: true,
      expiration_protected: false,
      hold_registrar: false,
      name_servers: ['ns1.example.net', 'ns2.example.net'],
      contacts: [
        { role: 'REGISTRANT', name: 'Ada Lovelace', organization: 'Example Ltd', email: 'ada@example.com', phone: '+1.5550100' },
        { role: 'ADMIN', name: null, organization: 'Example Ltd', email: null, phone: null },
        { role: 'TECH', name: null, organization: null, email: 'tech@example.com', phone: null },
      ],
    });
  });

  it('fills every missing registrar field with null and falls back to the configured domain', async () => {
    mock(godaddyDomain).mockResolvedValue({ domain: '', status: undefined });
    await expect(dnsService.domain()).resolves.toEqual({
      configured: true,
      domain: 'example.com',
      domain_id: null,
      status: null,
      expires_at: null,
      created_at: null,
      days_to_expiry: null,
      renew_auto: null,
      renew_deadline: null,
      renewable: null,
      locked: null,
      privacy: null,
      transfer_protected: null,
      expiration_protected: null,
      hold_registrar: null,
      name_servers: [],
      contacts: [],
    });
  });

  it('reads an unparseable expiry as unknown and a passed one as negative days', async () => {
    mock(godaddyDomain).mockResolvedValue({ domain: 'example.com', status: 'ACTIVE', expires: 'soon' });
    expect((await dnsService.domain()).days_to_expiry).toBeNull();

    mock(godaddyDomain).mockResolvedValue({ domain: 'example.com', status: 'EXPIRED', expires: '2026-08-29T00:00:00Z' });
    expect((await dnsService.domain()).days_to_expiry).toBe(-3);
  });

  it('names a contact by first name alone when that is all there is', async () => {
    mock(godaddyDomain).mockResolvedValue({ domain: 'example.com', status: 'ACTIVE', contactTech: { nameFirst: 'Grace' } });
    expect((await dnsService.domain()).contacts).toEqual([
      { role: 'TECH', name: 'Grace', organization: null, email: null, phone: null },
    ]);
  });
});

describe('add', () => {
  it('normalises and sends a valid A record, and logs who added it', async () => {
    await expect(dnsService.add(aRecord({ type: ' a ', name: ' Shop ', data: ' 203.0.113.10 ' }), BY)).resolves.toBe(true);
    expect(godaddyAddRecords).toHaveBeenCalledWith(cfg, [{ type: 'A', name: 'shop', data: '203.0.113.10', ttl: 600 }]);
    expect(logs.server.info).toHaveBeenCalledWith('dns', 'add', { domain: 'example.com', type: 'A', name: 'shop', by: BY });
  });

  it.each([
    [aRecord({ name: '@' })],
    [aRecord({ name: '*' })],
    [aRecord({ name: '*.shop' })],
    [aRecord({ name: '_acme-challenge.api', type: 'TXT', data: 'token-value' })],
    [aRecord({ type: 'AAAA', data: '2001:db8::1' })],
    [aRecord({ type: 'CNAME', data: 'shops.example.net' })],
    [aRecord({ type: 'CAA', data: '0 issue "letsencrypt.org"', ttl: 604_800 })],
  ])('accepts %j', async (input) => {
    await expect(dnsService.add(input, BY)).resolves.toBe(true);
  });

  it('sends an MX record with its priority, including priority 0', async () => {
    await dnsService.add(aRecord({ type: 'MX', name: '@', data: 'mx.example.net', priority: 0 }), BY);
    expect(godaddyAddRecords).toHaveBeenCalledWith(cfg, [{ type: 'MX', name: '@', data: 'mx.example.net', ttl: 600, priority: 0 }]);
  });

  it.each([
    [aRecord({ type: 'NS', data: 'ns1.example.net' }), 'NS records are read-only here. This console writes A, AAAA, CNAME, MX, TXT, CAA records.'],
    [aRecord({ type: 'SRV' }), 'SRV records are read-only here. This console writes A, AAAA, CNAME, MX, TXT, CAA records.'],
    [aRecord({ name: 'example.com' }), 'Enter the name relative to example.com: "shop" for shop.example.com, "@" for example.com itself.'],
    [aRecord({ name: 'shop.example.com' }), 'Enter the name relative to example.com: "shop" for shop.example.com, "@" for example.com itself.'],
    [aRecord({ name: 'shop..api' }), 'A name is "@", or labels of letters, digits, "-" and "_" separated by dots.'],
    [aRecord({ name: 'sh op' }), 'A name is "@", or labels of letters, digits, "-" and "_" separated by dots.'],
    [aRecord({ name: 'shop.*' }), 'A name is "@", or labels of letters, digits, "-" and "_" separated by dots.'],
    [aRecord({ data: '   ' }), 'The value is required.'],
    [aRecord({ data: '203.0.113.300' }), 'An A record points at an IPv4 address, e.g. 203.0.113.10.'],
    [aRecord({ data: '2001:db8::1' }), 'An A record points at an IPv4 address, e.g. 203.0.113.10.'],
    [aRecord({ type: 'AAAA', data: '203.0.113.10' }), 'An AAAA record points at an IPv6 address.'],
    [aRecord({ ttl: 599 }), 'TTL is whole seconds between 600 and 604800.'],
    [aRecord({ ttl: 604_801 }), 'TTL is whole seconds between 600 and 604800.'],
    [aRecord({ ttl: 600.5 }), 'TTL is whole seconds between 600 and 604800.'],
    [aRecord({ ttl: '600' as unknown as number }), 'TTL is whole seconds between 600 and 604800.'],
    [aRecord({ type: 'MX', data: 'mx.example.net' }), 'An MX record needs a priority between 0 and 65535.'],
    [aRecord({ type: 'MX', data: 'mx.example.net', priority: null }), 'An MX record needs a priority between 0 and 65535.'],
    [aRecord({ type: 'MX', data: 'mx.example.net', priority: 65_536 }), 'An MX record needs a priority between 0 and 65535.'],
    [aRecord({ type: 'MX', data: 'mx.example.net', priority: -1 }), 'An MX record needs a priority between 0 and 65535.'],
  ])('refuses %j', async (input, message) => {
    await expect(dnsService.add(input, BY)).rejects.toMatchObject({ message, extensions: { code: 'BAD_USER_INPUT' } });
    expect(godaddyAddRecords).not.toHaveBeenCalled();
  });

  it('surfaces a missing GoDaddy configuration', async () => {
    mock(requireGodaddyConfig).mockRejectedValue(new Error('GoDaddy is not configured.'));
    await expect(dnsService.add(aRecord(), BY)).rejects.toThrow('GoDaddy is not configured.');
  });
});

describe('update', () => {
  const ref = { type: 'a', name: 'Shop', data: '203.0.113.10' };

  it('replaces only the addressed record in its set', async () => {
    mock(godaddyRecordSet).mockResolvedValue([
      { data: '203.0.113.9', ttl: 600 },
      { data: '203.0.113.10', ttl: 600 },
    ]);
    await expect(dnsService.update(ref, aRecord({ data: '203.0.113.20', ttl: 3600 }), BY)).resolves.toBe(true);
    expect(godaddyRecordSet).toHaveBeenCalledWith(cfg, 'A', 'shop');
    expect(godaddyReplaceSet).toHaveBeenCalledWith(cfg, 'A', 'shop', [
      { data: '203.0.113.9', ttl: 600 },
      { data: '203.0.113.20', ttl: 3600, priority: undefined },
    ]);
    expect(logs.server.info).toHaveBeenCalledWith('dns', 'update', { domain: 'example.com', type: 'A', name: 'shop', by: BY });
  });

  it('carries an MX priority into the rewritten set', async () => {
    mock(godaddyRecordSet).mockResolvedValue([{ data: 'mx1.example.net', ttl: 600, priority: 10 }]);
    await dnsService.update(
      { type: 'MX', name: '@', data: 'mx1.example.net' },
      aRecord({ type: 'MX', name: '@', data: 'mx2.example.net', priority: 20 }),
      BY
    );
    expect(godaddyReplaceSet).toHaveBeenCalledWith(cfg, 'MX', '@', [{ data: 'mx2.example.net', ttl: 600, priority: 20 }]);
  });

  it.each([
    [aRecord({ type: 'AAAA', data: '2001:db8::1' })],
    [aRecord({ name: 'store' })],
  ])('refuses an edit that changes the type or name (%j)', async (input) => {
    await expect(dnsService.update(ref, input, BY)).rejects.toMatchObject({
      message: 'An edit keeps the type and name. To change either, add the new record and delete this one.',
    });
    expect(godaddyRecordSet).not.toHaveBeenCalled();
  });

  it('refuses to edit a read-only record type', async () => {
    await expect(dnsService.update({ type: 'NS', name: '@', data: 'ns1.example.net' }, aRecord(), BY)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('refuses a record that has gone from the zone', async () => {
    mock(godaddyRecordSet).mockResolvedValue([{ data: '203.0.113.99', ttl: 600 }]);
    await expect(dnsService.update(ref, aRecord({ data: '203.0.113.20' }), BY)).rejects.toMatchObject({
      message: 'That record is no longer in the zone — it was changed or removed elsewhere. Reload the list.',
      extensions: { code: 'NOT_FOUND' },
    });
    expect(godaddyReplaceSet).not.toHaveBeenCalled();
  });
});

describe('remove', () => {
  const ref = { type: 'TXT', name: '@', data: 'v=spf1 -all' };

  it('writes the set back without the record when others remain', async () => {
    mock(godaddyRecordSet).mockResolvedValue([
      { data: 'v=spf1 -all', ttl: 600 },
      { data: 'google-site-verification=abc', ttl: 600 },
    ]);
    await expect(dnsService.remove(ref, BY)).resolves.toBe(true);
    expect(godaddyReplaceSet).toHaveBeenCalledWith(cfg, 'TXT', '@', [{ data: 'google-site-verification=abc', ttl: 600 }]);
    expect(godaddyDeleteSet).not.toHaveBeenCalled();
    expect(logs.server.info).toHaveBeenCalledWith('dns', 'delete', { domain: 'example.com', type: 'TXT', name: '@', by: BY });
  });

  it('deletes the whole set when it held only this record', async () => {
    mock(godaddyRecordSet).mockResolvedValue([{ data: 'v=spf1 -all', ttl: 600 }]);
    await dnsService.remove(ref, BY);
    expect(godaddyDeleteSet).toHaveBeenCalledWith(cfg, 'TXT', '@');
    expect(godaddyReplaceSet).not.toHaveBeenCalled();
  });

  it('refuses a read-only type and a record that is already gone', async () => {
    await expect(dnsService.remove({ type: 'soa', name: '@', data: 'x' }, BY)).rejects.toMatchObject({
      message: 'SOA records are read-only here. This console writes A, AAAA, CNAME, MX, TXT, CAA records.',
    });
    mock(godaddyRecordSet).mockResolvedValue([]);
    await expect(dnsService.remove(ref, BY)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    expect(godaddyDeleteSet).not.toHaveBeenCalled();
  });
});
