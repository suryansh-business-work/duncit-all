import { cloudflareService } from '../../cloudflare.service';
import { compareZones } from '../../cloudflare.compare';
import * as snapshots from '../../cloudflare.snapshot';
import { cloudflareActivationCheck, cloudflareCreateRecord, cloudflareCreateZone, cloudflareDeleteRecord, cloudflareZone } from '../../cloudflare.gateway';
import { godaddyDomain } from '@modules/platform/dns/godaddy.gateway';
import { logs } from '@observability/log';

jest.mock('../../cloudflare.snapshot', () => ({
  ...jest.requireActual('../../cloudflare.snapshot'),
  connections: jest.fn(),
  requireConnected: jest.fn(),
  snapshot: jest.fn(),
  snapshotWithZone: jest.fn(),
}));
jest.mock('../../cloudflare.gateway', () => ({
  cloudflareActivationCheck: jest.fn(),
  cloudflareCreateRecord: jest.fn(),
  cloudflareCreateZone: jest.fn(),
  cloudflareDeleteRecord: jest.fn(),
  cloudflareZone: jest.fn(),
}));
jest.mock('@modules/platform/dns/godaddy.gateway', () => ({ godaddyDomain: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn() } } }));

const DOMAIN = 'duncit.com';
const gd = { key: 'k', secret: 's', domain: DOMAIN } as never;
const cf = { apiToken: 't', accountId: 'a', domain: DOMAIN } as never;
const conn = { godaddy: gd, cloudflare: cf };
const zone = { id: 'z1', name: DOMAIN, status: 'active', paused: false, name_servers: ['B.ns.cloudflare.com.', 'a.ns.cloudflare.com'], activated_on: '2026-01-01' };

const goDaddyRecords = [
  { type: 'A', name: 'www', data: '1.2.3.4', ttl: 600 },
  { type: 'TXT', name: '@', data: 'v=spf1 -all', ttl: 600 },
  { type: 'MX', name: '@', data: 'mail.duncit.com', ttl: 600, priority: 10 },
  { type: 'ALIAS', name: 'app', data: 'target.example.com', ttl: 600 },
  { type: 'NS', name: '@', data: 'ns01.domaincontrol.com', ttl: 3600 },
  { type: 'SOA', name: '@', data: 'soa', ttl: 3600 },
];
const cloudflareRecords = [
  { id: 'c1', type: 'A', name: `www.${DOMAIN}`, content: '1.2.3.4', ttl: 300 },
  { id: 'c2', type: 'A', name: `extra.${DOMAIN}`, content: '9.9.9.9', ttl: 300 },
];
const snap = (over: Record<string, unknown> = {}) => ({
  zone,
  godaddyRecords: goDaddyRecords,
  compare: compareZones(goDaddyRecords as never, cloudflareRecords as never, DOMAIN),
  ...over,
});
const rowId = (snapshot: ReturnType<typeof snap>, state: string, type: string) =>
  snapshot.compare.rows.find((r) => r.state === state && r.type === type)?.id as string;

beforeEach(() => {
  (snapshots.requireConnected as jest.Mock).mockResolvedValue(conn);
  (snapshots.snapshotWithZone as jest.Mock).mockResolvedValue(snap());
  (snapshots.snapshot as jest.Mock).mockResolvedValue(snap());
  (godaddyDomain as jest.Mock).mockResolvedValue({ nameServers: ['ns01.domaincontrol.com', 'ns02.domaincontrol.com'] });
});

describe('migration', () => {
  it('answers "not connected" with empty data when either side is unconfigured', async () => {
    (snapshots.connections as jest.Mock).mockResolvedValue({ godaddy: null, cloudflare: cf });
    await expect(cloudflareService.migration()).resolves.toMatchObject({
      godaddy_configured: false, cloudflare_configured: true, domain: DOMAIN, cloudflare_domain: DOMAIN, connected: false, zone: null, rows: [],
      live_provider: 'UNKNOWN', ready_to_switch: false,
    });
    (snapshots.connections as jest.Mock).mockResolvedValue({ godaddy: gd, cloudflare: null });
    await expect(cloudflareService.migration()).resolves.toMatchObject({ godaddy_configured: true, cloudflare_configured: false, domain: DOMAIN, cloudflare_domain: '', connected: false });
    (snapshots.connections as jest.Mock).mockResolvedValue({ godaddy: null, cloudflare: null });
    await expect(cloudflareService.migration()).resolves.toMatchObject({ domain: '', cloudflare_domain: '' });
  });

  it('does not connect two different domains', async () => {
    (snapshots.connections as jest.Mock).mockResolvedValue({ godaddy: gd, cloudflare: { ...(cf as object), domain: 'duncit.in' } });
    await expect(cloudflareService.migration()).resolves.toMatchObject({ connected: false, domain: DOMAIN, cloudflare_domain: 'duncit.in' });
    expect(snapshots.snapshot).not.toHaveBeenCalled();
  });

  it('shows both zones side by side, where the domain points now, and whether it can switch', async () => {
    (snapshots.connections as jest.Mock).mockResolvedValue(conn);
    const out = await cloudflareService.migration();
    expect(out).toMatchObject({
      connected: true, matched: 1, godaddy_only: 3, cloudflare_only: 1,
      current_name_servers: ['ns01.domaincontrol.com', 'ns02.domaincontrol.com'], godaddy_name_servers: ['ns01.domaincontrol.com'],
      live_provider: 'GODADDY', ready_to_switch: false,
      zone: { id: 'z1', status: 'active', paused: false, name_servers: ['a.ns.cloudflare.com', 'b.ns.cloudflare.com'], activated_on: '2026-01-01' },
    });
    expect(out.rows.length).toBeGreaterThan(0);
    for (const row of out.rows) {
      expect(row).not.toHaveProperty('source');
      expect(row).not.toHaveProperty('cloudflare_id');
    }
  });

  it('is ready to switch once nothing is left only on GoDaddy', async () => {
    (snapshots.connections as jest.Mock).mockResolvedValue(conn);
    (snapshots.snapshot as jest.Mock).mockResolvedValue(snap({ compare: compareZones([goDaddyRecords[0]] as never, cloudflareRecords as never, DOMAIN) }));
    (godaddyDomain as jest.Mock).mockResolvedValue({ nameServers: ['a.ns.cloudflare.com', 'b.ns.cloudflare.com'] });
    await expect(cloudflareService.migration()).resolves.toMatchObject({ ready_to_switch: true, live_provider: 'CLOUDFLARE' });
  });

  it('copes with a zone not added yet, a registrar that reports no nameservers, and a sparse zone', async () => {
    (snapshots.connections as jest.Mock).mockResolvedValue(conn);
    (snapshots.snapshot as jest.Mock).mockResolvedValue(snap({ zone: null }));
    (godaddyDomain as jest.Mock).mockResolvedValue({});
    await expect(cloudflareService.migration()).resolves.toMatchObject({ zone: null, current_name_servers: [], live_provider: 'UNKNOWN', ready_to_switch: false });
    (snapshots.snapshot as jest.Mock).mockResolvedValue(snap({ zone: { id: 'z2', status: 'pending' } }));
    await expect(cloudflareService.migration()).resolves.toMatchObject({ zone: { id: 'z2', paused: false, name_servers: [], activated_on: null } });
  });
});

describe('createZone', () => {
  it('adds the domain to Cloudflare and logs who did it', async () => {
    (cloudflareZone as jest.Mock).mockResolvedValue(null);
    (cloudflareCreateZone as jest.Mock).mockResolvedValue({ id: 'z9' });
    await cloudflareService.createZone('ops@duncit.com');
    expect(cloudflareCreateZone).toHaveBeenCalledWith(cf);
    expect(logs.server.info).toHaveBeenCalledWith('cloudflare', 'zone-create', { domain: DOMAIN, zone_id: 'z9', by: 'ops@duncit.com' });
  });

  it('leaves a zone that is already there as it is', async () => {
    (cloudflareZone as jest.Mock).mockResolvedValue(zone);
    await cloudflareService.createZone('ops');
    expect(cloudflareCreateZone).not.toHaveBeenCalled();
  });
});

describe('copy', () => {
  it('refuses an empty selection', async () => {
    await expect(cloudflareService.copy([], 'ops')).rejects.toMatchObject({ message: 'Pick at least one record to copy.', extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('copies each GoDaddy-only record on its own and reports how it went', async () => {
    const snapshot = snap();
    (snapshots.snapshotWithZone as jest.Mock).mockResolvedValue(snapshot);
    const txt = rowId(snapshot, 'GODADDY_ONLY', 'TXT');
    const mx = rowId(snapshot, 'GODADDY_ONLY', 'MX');
    (cloudflareCreateRecord as jest.Mock).mockImplementation(async (_cfg: unknown, _zone: string, record: { type: string }) => {
      if (record.type === 'MX') throw new Error('Cloudflare refused MX');
    });
    const out = await cloudflareService.copy([txt, mx], 'ops@duncit.com');
    expect(out.synced).toBe(1);
    expect(out.failed).toBe(1);
    expect(out.outcomes.find((o) => o.id === txt)).toMatchObject({ ok: true, message: null, host: expect.any(String) });
    expect(out.outcomes.find((o) => o.id === mx)).toMatchObject({ ok: false, message: 'Cloudflare refused MX' });
    expect(cloudflareCreateRecord).toHaveBeenCalledTimes(2);
    expect((cloudflareCreateRecord as jest.Mock).mock.calls[0][1]).toBe('z1');
    expect(logs.server.info).toHaveBeenCalledWith('cloudflare', 'copy', { domain: DOMAIN, synced: 1, failed: 1, by: 'ops@duncit.com' });
  });

  it('says a non-Error refusal in plain words', async () => {
    const snapshot = snap();
    (snapshots.snapshotWithZone as jest.Mock).mockResolvedValue(snapshot);
    (cloudflareCreateRecord as jest.Mock).mockRejectedValue('boom');
    const out = await cloudflareService.copy([rowId(snapshot, 'GODADDY_ONLY', 'TXT')], 'ops');
    expect(out.outcomes[0]).toMatchObject({ ok: false, message: 'Cloudflare refused the write.' });
  });

  it('reports a record that cannot be copied instead of sending it, naming why', async () => {
    const snapshot = snap();
    (snapshots.snapshotWithZone as jest.Mock).mockResolvedValue(snapshot);
    const alias = rowId(snapshot, 'GODADDY_ONLY', 'ALIAS');
    const both = rowId(snapshot, 'BOTH', 'A');
    const out = await cloudflareService.copy([alias, both], 'ops');
    expect(cloudflareCreateRecord).not.toHaveBeenCalled();
    expect(out.outcomes.find((o) => o.id === alias)).toMatchObject({ ok: false, message: 'ALIAS records are not copied.' });
    expect(out.outcomes.find((o) => o.id === both)).toMatchObject({ ok: false, message: expect.stringMatching(/is already on Cloudflare\.$/) });
    expect(out).toMatchObject({ synced: 0, failed: 2 });
  });

  it('refuses the whole call when a selected row is stale, naming it', async () => {
    const snapshot = snap();
    (snapshots.snapshotWithZone as jest.Mock).mockResolvedValue(snapshot);
    const txt = rowId(snapshot, 'GODADDY_ONLY', 'TXT');
    await expect(cloudflareService.copy([txt, 'gone-1', 'gone-2'], 'ops')).rejects.toMatchObject({
      message: 'These records changed since the list was read. Reload and try again: gone-1, gone-2',
      extensions: { code: 'NOT_FOUND' },
    });
    expect(cloudflareCreateRecord).not.toHaveBeenCalled();
  });
});

describe('removeRecord', () => {
  it('removes a record from Cloudflare only, logging what was removed', async () => {
    const snapshot = snap();
    (snapshots.snapshotWithZone as jest.Mock).mockResolvedValue(snapshot);
    const extra = rowId(snapshot, 'CLOUDFLARE_ONLY', 'A');
    await expect(cloudflareService.removeRecord(extra, 'ops')).resolves.toBe(true);
    expect(cloudflareDeleteRecord).toHaveBeenCalledWith(cf, 'z1', 'c2');
    expect(logs.server.info).toHaveBeenCalledWith('cloudflare', 'record-delete', { domain: DOMAIN, type: 'A', name: 'extra', by: 'ops' });
  });

  it('refuses a row that has no Cloudflare record to remove', async () => {
    const snapshot = snap();
    (snapshots.snapshotWithZone as jest.Mock).mockResolvedValue(snapshot);
    const txt = rowId(snapshot, 'GODADDY_ONLY', 'TXT');
    await expect(cloudflareService.removeRecord(txt, 'ops')).rejects.toMatchObject({
      message: expect.stringMatching(/has no Cloudflare record to remove\.$/),
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(cloudflareDeleteRecord).not.toHaveBeenCalled();
  });

  it('refuses a row that is no longer there', async () => {
    await expect(cloudflareService.removeRecord('gone', 'ops')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('activationCheck', () => {
  it('asks Cloudflare to re-check the nameservers now', async () => {
    (cloudflareZone as jest.Mock).mockResolvedValue(zone);
    await expect(cloudflareService.activationCheck('ops')).resolves.toBe(true);
    expect(cloudflareActivationCheck).toHaveBeenCalledWith(cf, 'z1');
    expect(logs.server.info).toHaveBeenCalledWith('cloudflare', 'activation-check', { domain: DOMAIN, by: 'ops' });
  });

  it('refuses before the zone has been added', async () => {
    (cloudflareZone as jest.Mock).mockResolvedValue(null);
    await expect(cloudflareService.activationCheck('ops')).rejects.toMatchObject({ message: 'duncit.com is not on Cloudflare yet.', extensions: { code: 'BAD_REQUEST' } });
    expect(cloudflareActivationCheck).not.toHaveBeenCalled();
  });
});
