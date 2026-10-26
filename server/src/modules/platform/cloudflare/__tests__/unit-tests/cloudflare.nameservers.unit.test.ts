import { nameServerService } from '../../cloudflare.nameservers';
import { compareZones } from '../../cloudflare.compare';
import * as snapshots from '../../cloudflare.snapshot';
import { cloudflareActivationCheck } from '../../cloudflare.gateway';
import { godaddyDomain, godaddySetNameServers } from '@modules/platform/dns/godaddy.gateway';
import { logs } from '@observability/log';

jest.mock('../../cloudflare.snapshot', () => ({
  ...jest.requireActual('../../cloudflare.snapshot'),
  requireConnected: jest.fn(),
  snapshot: jest.fn(),
  snapshotWithZone: jest.fn(),
}));
jest.mock('../../cloudflare.gateway', () => ({ cloudflareActivationCheck: jest.fn() }));
jest.mock('@modules/platform/dns/godaddy.gateway', () => ({ godaddyDomain: jest.fn(), godaddySetNameServers: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn(), warn: jest.fn() } } }));

const DOMAIN = 'duncit.com';
const conn = { godaddy: { domain: DOMAIN } as never, cloudflare: { domain: DOMAIN } as never };
const zone = (over: Record<string, unknown> = {}) => ({ id: 'z1', name: DOMAIN, status: 'pending', name_servers: ['b.ns.cloudflare.com', 'A.ns.cloudflare.com.'], ...over });

/** A snapshot whose comparison has `missing` GoDaddy-only A records. */
const snap = (missing: number, zoneOver: Record<string, unknown> = {}) => {
  const records = Array.from({ length: missing }, (_, i) => ({ type: 'A', name: `host${i}`, data: `1.1.1.${i}`, ttl: 600 }));
  return { zone: zone(zoneOver), godaddyRecords: records, compare: compareZones(records as never, [], DOMAIN) };
};

beforeEach(() => {
  (snapshots.requireConnected as jest.Mock).mockResolvedValue(conn);
  (godaddyDomain as jest.Mock).mockResolvedValue({ nameServers: ['NS01.domaincontrol.com.', 'ns02.domaincontrol.com'] });
  (godaddySetNameServers as jest.Mock).mockResolvedValue(undefined);
});

describe('switching to Cloudflare', () => {
  it('points the domain at the pair Cloudflare assigned, logs the before and after, and nudges the zone to activate', async () => {
    (snapshots.snapshotWithZone as jest.Mock).mockResolvedValue(snap(0));
    await expect(nameServerService.set('CLOUDFLARE', null, 'ops@duncit.com')).resolves.toBe(true);
    expect(godaddySetNameServers).toHaveBeenCalledWith(conn.godaddy, ['a.ns.cloudflare.com', 'b.ns.cloudflare.com']);
    expect(logs.server.info).toHaveBeenCalledWith('cloudflare', 'name-servers', {
      domain: DOMAIN, target: 'CLOUDFLARE', from: ['ns01.domaincontrol.com', 'ns02.domaincontrol.com'], to: ['a.ns.cloudflare.com', 'b.ns.cloudflare.com'], by: 'ops@duncit.com',
    });
    expect(cloudflareActivationCheck).toHaveBeenCalledWith(conn.cloudflare, 'z1');
  });

  it('refuses while GoDaddy records are missing on Cloudflare, naming up to ten of them', async () => {
    (snapshots.snapshotWithZone as jest.Mock).mockResolvedValue(snap(12));
    await expect(nameServerService.set('CLOUDFLARE', null, 'ops')).rejects.toMatchObject({
      message: expect.stringContaining('12 GoDaddy record(s) are not on Cloudflare yet and would stop resolving: A host0.duncit.com'),
      extensions: { code: 'BAD_USER_INPUT' },
    });
    const message = String((await nameServerService.set('CLOUDFLARE', null, 'ops').catch((e) => e)).message);
    expect(message).toContain('host7.duncit.com');
    expect(message).not.toContain('host8.duncit.com');
    expect(message).toContain('Copy them first.');
    expect(godaddySetNameServers).not.toHaveBeenCalled();
  });

  it('refuses before Cloudflare has assigned its nameservers', async () => {
    (snapshots.snapshotWithZone as jest.Mock).mockResolvedValue(snap(0, { name_servers: [] }));
    await expect(nameServerService.set('CLOUDFLARE', null, 'ops')).rejects.toMatchObject({
      message: 'Cloudflare has not assigned nameservers to this zone yet. Reload in a minute.',
    });
    (snapshots.snapshotWithZone as jest.Mock).mockResolvedValue(snap(0, { name_servers: undefined }));
    await expect(nameServerService.set('CLOUDFLARE', null, 'ops')).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('keeps the switch when the activation nudge is refused, logging it', async () => {
    (snapshots.snapshotWithZone as jest.Mock).mockResolvedValue(snap(0));
    (cloudflareActivationCheck as jest.Mock).mockRejectedValue(new Error('rate limited'));
    await expect(nameServerService.set('CLOUDFLARE', null, 'ops')).resolves.toBe(true);
    expect(logs.server.warn).toHaveBeenCalledWith('cloudflare', 'activation-check', { domain: DOMAIN, error: expect.any(Error) });
  });

  it('records an empty "before" when the registrar reported no nameservers', async () => {
    (snapshots.snapshotWithZone as jest.Mock).mockResolvedValue(snap(0));
    (godaddyDomain as jest.Mock).mockResolvedValue({});
    await nameServerService.set('CLOUDFLARE', null, 'ops');
    expect((logs.server.info as jest.Mock).mock.calls[0][2].from).toEqual([]);
  });
});

describe('switching back to GoDaddy', () => {
  it('restores the NS set GoDaddy’s own zone still holds, and does not touch Cloudflare', async () => {
    (snapshots.snapshot as jest.Mock).mockResolvedValue({ zone: zone(), godaddyRecords: [{ type: 'NS', name: '@', data: 'NS01.domaincontrol.com.' }, { type: 'NS', name: '@', data: 'ns02.domaincontrol.com' }], compare: {} });
    await expect(nameServerService.set('GODADDY', null, 'ops')).resolves.toBe(true);
    expect(godaddySetNameServers).toHaveBeenCalledWith(conn.godaddy, ['ns01.domaincontrol.com', 'ns02.domaincontrol.com']);
    expect(cloudflareActivationCheck).not.toHaveBeenCalled();
  });

  it('refuses when the GoDaddy zone holds no NS records to restore', async () => {
    (snapshots.snapshot as jest.Mock).mockResolvedValue({ zone: null, godaddyRecords: [], compare: {} });
    await expect(nameServerService.set('GODADDY', null, 'ops')).rejects.toMatchObject({
      message: expect.stringContaining('The GoDaddy zone holds no NS records at @ to restore.'),
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });
});

describe('custom nameservers', () => {
  const set = (servers: string[] | null | undefined) => nameServerService.set('CUSTOM', servers, 'ops');

  it('applies a valid hand-typed pair, normalised and sorted', async () => {
    await expect(set(['NS2.Example.net.', 'ns1.example.net'])).resolves.toBe(true);
    expect(godaddySetNameServers).toHaveBeenCalledWith(conn.godaddy, ['ns1.example.net', 'ns2.example.net']);
    expect(cloudflareActivationCheck).not.toHaveBeenCalled();
  });

  it.each([
    ['none at all', null],
    ['nothing given', undefined],
    ['a single server', ['ns1.example.net']],
    ['the same server twice', ['ns1.example.net', 'NS1.example.net.']],
    ['too many', Array.from({ length: 14 }, (_, i) => `ns${i}.example.net`)],
  ])('refuses %s', async (_label, servers) => {
    await expect(set(servers as never)).rejects.toMatchObject({ message: 'Enter between 2 and 13 different nameservers.', extensions: { code: 'BAD_USER_INPUT' } });
    expect(godaddySetNameServers).not.toHaveBeenCalled();
  });

  it('accepts exactly thirteen', async () => {
    await expect(set(Array.from({ length: 13 }, (_, i) => `ns${i}.example.net`))).resolves.toBe(true);
  });

  it.each([
    ['a single label', 'localhost'],
    ['an empty label', 'ns1..example.net'],
    ['a leading hyphen', '-ns1.example.net'],
    ['a trailing hyphen', 'ns1-.example.net'],
    ['a bad character', 'ns_1.example.net'],
    ['a label over 63 characters', `${'a'.repeat(64)}.example.net`],
    ['a name over 253 characters', `${'a'.repeat(60)}.${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.${'e'.repeat(20)}.net`],
  ])('refuses a nameserver with %s', async (_label, bad) => {
    await expect(set(['ns1.example.net', bad])).rejects.toMatchObject({ message: expect.stringContaining('These are not hostnames:') });
  });

  it('accepts a label of exactly 63 characters and hyphens inside a label', async () => {
    await expect(set([`${'a'.repeat(63)}.example.net`, 'ns-1.example-dns.net'])).resolves.toBe(true);
  });

  it('refuses a nameserver under the domain it serves, which needs glue records', async () => {
    await expect(set(['ns1.duncit.com', 'ns2.example.net'])).rejects.toMatchObject({
      message: 'A nameserver under duncit.com needs glue records at GoDaddy. Use nameservers outside duncit.com.',
    });
    await expect(set(['duncit.com', 'ns2.example.net'])).rejects.toMatchObject({ message: expect.stringContaining('glue records') });
    await expect(set(['ns1.notduncit.com', 'ns2.example.net'])).resolves.toBe(true);
  });
});
