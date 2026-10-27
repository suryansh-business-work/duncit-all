import {
  connections,
  godaddyNameServers,
  liveProvider,
  nameServerSet,
  requireConnected,
  snapshot,
  snapshotWithZone,
} from '../../cloudflare.snapshot';
import { godaddyConfig, godaddyRecords, requireGodaddyConfig } from '@modules/platform/dns/godaddy.gateway';
import { cloudflareConfig, cloudflareRecords, cloudflareZone, requireCloudflareConfig } from '../../cloudflare.gateway';

jest.mock('@modules/platform/dns/godaddy.gateway', () => ({ godaddyConfig: jest.fn(), godaddyRecords: jest.fn(), requireGodaddyConfig: jest.fn() }));
jest.mock('../../cloudflare.gateway', () => ({ cloudflareConfig: jest.fn(), cloudflareRecords: jest.fn(), cloudflareZone: jest.fn(), requireCloudflareConfig: jest.fn() }));

const gd = { key: 'k', secret: 's', domain: 'duncit.com' } as never;
const cf = { apiToken: 't', accountId: 'a', domain: 'duncit.com' } as never;

describe('nameServerSet', () => {
  it('lower-cases, strips the trailing dot, de-duplicates, drops blanks and sorts', () => {
    expect(nameServerSet([' NS2.Example.com. ', 'ns1.example.com', 'ns1.example.com.', '', '  '])).toEqual(['ns1.example.com', 'ns2.example.com']);
    expect(nameServerSet([])).toEqual([]);
  });
});

describe('liveProvider', () => {
  const assigned = ['amy.ns.cloudflare.com', 'bob.ns.cloudflare.com'];

  it('is UNKNOWN when the registrar reports no nameservers', () => {
    expect(liveProvider([], assigned)).toBe('UNKNOWN');
    expect(liveProvider(['', ' '], assigned)).toBe('UNKNOWN');
  });

  it('is CLOUDFLARE when the registrar serves exactly the pair Cloudflare assigned, in any order or case', () => {
    expect(liveProvider(['BOB.ns.cloudflare.com.', 'amy.ns.cloudflare.com'], assigned)).toBe('CLOUDFLARE');
  });

  it('is GODADDY when every nameserver is one of GoDaddy’s', () => {
    expect(liveProvider(['ns01.domaincontrol.com', 'ns02.domaincontrol.com'], assigned)).toBe('GODADDY');
    expect(liveProvider(['ns01.domaincontrol.com'], [])).toBe('GODADDY');
  });

  it('is OTHER for a mix, for a partial Cloudflare pair, or for anyone else', () => {
    expect(liveProvider(['ns01.domaincontrol.com', 'ns1.other.net'], assigned)).toBe('OTHER');
    expect(liveProvider(['amy.ns.cloudflare.com'], assigned)).toBe('OTHER');
    expect(liveProvider(['ns1.other.net'], [])).toBe('OTHER');
  });
});

describe('godaddyNameServers', () => {
  it('reads the NS set at the apex only', () => {
    const records = [
      { type: 'NS', name: '@', data: 'NS01.domaincontrol.com.' },
      { type: 'NS', name: '@', data: 'ns02.domaincontrol.com' },
      { type: 'NS', name: 'sub', data: 'ns.other.net' },
      { type: 'A', name: '@', data: '1.2.3.4' },
    ];
    expect(godaddyNameServers(records as never)).toEqual(['ns01.domaincontrol.com', 'ns02.domaincontrol.com']);
    expect(godaddyNameServers([])).toEqual([]);
  });
});

describe('connections', () => {
  it('returns both configs as they stand, either null when not filled in', async () => {
    (godaddyConfig as jest.Mock).mockResolvedValue(gd);
    (cloudflareConfig as jest.Mock).mockResolvedValue(null);
    await expect(connections()).resolves.toEqual({ godaddy: gd, cloudflare: null });
  });
});

describe('requireConnected', () => {
  it('returns both configs when they name the same domain', async () => {
    (requireGodaddyConfig as jest.Mock).mockResolvedValue(gd);
    (requireCloudflareConfig as jest.Mock).mockResolvedValue(cf);
    await expect(requireConnected()).resolves.toEqual({ godaddy: gd, cloudflare: cf });
  });

  it('refuses when the two name different domains, naming both', async () => {
    (requireGodaddyConfig as jest.Mock).mockResolvedValue(gd);
    (requireCloudflareConfig as jest.Mock).mockResolvedValue({ ...(cf as object), domain: 'duncit.in' });
    await expect(requireConnected()).rejects.toMatchObject({
      message: 'GoDaddy manages duncit.com but Cloudflare is set to duncit.in. Make the two domains match in Tech → Environment Variables.',
      extensions: { code: 'BAD_REQUEST' },
    });
  });

  it('passes on a refusal from either provider’s own config', async () => {
    (requireGodaddyConfig as jest.Mock).mockRejectedValue(new Error('GoDaddy is not connected'));
    (requireCloudflareConfig as jest.Mock).mockResolvedValue(cf);
    await expect(requireConnected()).rejects.toThrow('GoDaddy is not connected');
  });
});

describe('snapshot', () => {
  const godaddy = [{ type: 'A', name: 'www', data: '1.2.3.4', ttl: 600 }];

  it('compares GoDaddy’s records with the Cloudflare zone’s once the zone id is known', async () => {
    (godaddyRecords as jest.Mock).mockResolvedValue(godaddy);
    (cloudflareZone as jest.Mock).mockResolvedValue({ id: 'z1', name: 'duncit.com', status: 'active' });
    (cloudflareRecords as jest.Mock).mockResolvedValue([{ id: 'c1', type: 'A', name: 'www.duncit.com', content: '1.2.3.4', ttl: 300 }]);
    const snap = await snapshot({ godaddy: gd, cloudflare: cf });
    expect(cloudflareRecords).toHaveBeenCalledWith(cf, 'z1');
    expect(snap.zone).toMatchObject({ id: 'z1' });
    expect(snap.godaddyRecords).toBe(godaddy);
    expect(snap.compare).toMatchObject({ matched: 1, godaddy_only: 0, cloudflare_only: 0 });
  });

  it('reads no Cloudflare records before the zone exists, so every GoDaddy record is GoDaddy-only', async () => {
    (godaddyRecords as jest.Mock).mockResolvedValue(godaddy);
    (cloudflareZone as jest.Mock).mockResolvedValue(null);
    const snap = await snapshot({ godaddy: gd, cloudflare: cf });
    expect(cloudflareRecords).not.toHaveBeenCalled();
    expect(snap.zone).toBeNull();
    expect(snap.compare).toMatchObject({ matched: 0, godaddy_only: 1 });
  });
});

describe('snapshotWithZone', () => {
  it('returns the snapshot with its zone', async () => {
    (godaddyRecords as jest.Mock).mockResolvedValue([]);
    (cloudflareZone as jest.Mock).mockResolvedValue({ id: 'z1', name: 'duncit.com', status: 'active' });
    (cloudflareRecords as jest.Mock).mockResolvedValue([]);
    const snap = await snapshotWithZone({ godaddy: gd, cloudflare: cf });
    expect(snap.zone.id).toBe('z1');
  });

  it('says to add the zone first when there is none', async () => {
    (godaddyRecords as jest.Mock).mockResolvedValue([]);
    (cloudflareZone as jest.Mock).mockResolvedValue(null);
    await expect(snapshotWithZone({ godaddy: gd, cloudflare: cf })).rejects.toMatchObject({
      message: 'duncit.com is not on Cloudflare yet. Add the zone first.',
      extensions: { code: 'BAD_REQUEST' },
    });
  });
});
