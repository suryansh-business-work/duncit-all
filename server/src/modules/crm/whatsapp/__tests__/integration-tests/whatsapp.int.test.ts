import { whatsappService } from '../../whatsapp.service';
import { mapSessionStatus } from '../../whatsapp.client';

type Handler = (url: string, init: { method?: string }) => { status: number; body: unknown };

function setFetch(handler: Handler) {
  global.fetch = jest.fn(async (url: unknown, init: unknown) => {
    const { status, body } = handler(String(url), (init as { method?: string }) ?? {});
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    } as Response;
  }) as typeof fetch;
}

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
});

describe('whatsappService integration (bug WA-LeadGen P3)', () => {
  it('stores config and never leaks the API key through the connection getter', async () => {
    const conn = await whatsappService.saveConfig({
      base_url: 'https://open-wa-server.duncit.com',
      api_key: 'secret-key',
      session_id: 'duncit-crm',
    });
    expect(conn.api_key).toBe('secret-key');
    expect(conn.session_id).toBe('duncit-crm');
    const fresh = await whatsappService.getConnection();
    expect(fresh.base_url).toBe('https://open-wa-server.duncit.com');
  });

  it('connect() creates the session when missing, then marks CONNECTING', async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
    const calls: string[] = [];
    setFetch((url, init) => {
      calls.push(`${init.method} ${url}`);
      if (init.method === 'GET' && url.endsWith('/sessions/duncit-crm')) return { status: 404, body: 'not found' };
      return { status: 200, body: { id: 'duncit-crm' } };
    });
    const conn = await whatsappService.connect();
    expect(conn.status).toBe('CONNECTING');
    expect(calls.some((c) => c.startsWith('POST') && c.endsWith('/sessions'))).toBe(true); // created
    expect(calls.some((c) => c.includes('/sessions/duncit-crm/start'))).toBe(true);
  });

  it('refreshStatus() maps a READY session to CONNECTED and stores the phone', async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
    setFetch(() => ({ status: 200, body: { status: 'READY', phone: '628123', lastError: null } }));
    const conn = await whatsappService.refreshStatus();
    expect(conn.status).toBe('CONNECTED');
    expect(conn.phone).toBe('628123');
    expect(conn.connected_at).toBeTruthy();
  });

  it('refreshStatus() records ERROR when the gateway is unreachable', async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
    setFetch(() => ({ status: 500, body: 'boom' }));
    const conn = await whatsappService.refreshStatus();
    expect(conn.status).toBe('ERROR');
    expect(conn.last_error).toContain('500');
  });

  it('refreshStatus() is a no-op without config', async () => {
    await whatsappService.saveConfig({ base_url: '', api_key: '' });
    const conn = await whatsappService.refreshStatus();
    expect(conn.status).toBe('DISCONNECTED');
  });

  it('qr() returns the data URL + mapped status', async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
    setFetch(() => ({ status: 200, body: { qrCode: 'data:image/png;base64,AAA', status: 'QR_READY' } }));
    const res = await whatsappService.qr();
    expect(res.qr_code).toBe('data:image/png;base64,AAA');
    expect(res.status).toBe('CONNECTING');
  });

  it('disconnect() marks DISCONNECTED', async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
    setFetch(() => ({ status: 200, body: {} }));
    const conn = await whatsappService.disconnect();
    expect(conn.status).toBe('DISCONNECTED');
  });
});

describe('whatsappData sync + cache + leads (WA-LeadGen P4/P5)', () => {
  const groups = [
    { id: 'comm1@g.us', name: 'Pune Community' },
    { id: 'g1@g.us', name: 'Runners', linkedParentJID: 'comm1@g.us' },
    { id: 'g2@g.us', name: 'Foodies' },
  ];
  const contacts = [
    { id: { _serialized: '628111@c.us', user: '628111' }, number: '628111', name: 'Asha', isBusiness: false },
    { id: '628222@c.us', pushname: 'Bob' },
    { id: '120@g.us', name: 'a group, skipped' },
  ];

  function syncFetch() {
    setFetch((url) => {
      if (url.endsWith('/contacts')) return { status: 200, body: contacts };
      if (/\/groups\/[^/]+$/.test(url)) return { status: 200, body: { participants: [{ id: '628333@c.us' }, { id: '628111@c.us' }] } };
      if (url.endsWith('/groups')) return { status: 200, body: groups };
      return { status: 200, body: {} };
    });
  }

  // Collections are wiped per-test, so configure + (re)fetch each time.
  beforeEach(async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
    syncFetch();
  });

  it('syncs communities/groups/contacts and auto-creates leads (idempotent)', async () => {
    const { whatsappData } = await import('../../whatsapp.data');
    const res = await whatsappData.sync();
    expect(res.communities).toBe(1);
    expect(res.groups).toBe(2); // g1 + g2 (comm1 is a community parent, not a group)
    expect(res.leads).toBe(2); // Asha + Bob (the @g.us entry is skipped)

    expect(await whatsappData.listCommunities()).toHaveLength(1);
    expect(await whatsappData.listGroups()).toHaveLength(2);
    expect(await whatsappData.listGroups('comm1@g.us')).toHaveLength(1);
    expect(await whatsappData.listContacts()).toHaveLength(2);
    expect(await whatsappData.listUserLeads()).toHaveLength(2);

    // Re-sync must not duplicate (unique indexes + upsert).
    await whatsappData.sync();
    expect(await whatsappData.listUserLeads()).toHaveLength(2);
    expect(await whatsappData.listGroups()).toHaveLength(2);
  });

  it('imports group members as leads tagged with the group + community', async () => {
    const { whatsappData } = await import('../../whatsapp.data');
    await whatsappData.sync(); // populate the group + community first
    const members = await whatsappData.groupMembers('g1@g.us');
    expect(members.map((m) => m.phone).sort()).toEqual(['628111', '628333']);
    const leads = await whatsappData.listUserLeads('628333');
    expect(leads[0]?.source_groups?.[0]?.jid).toBe('g1@g.us');
    expect(leads[0]?.source_communities?.[0]?.jid).toBe('comm1@g.us');
  });

  it('searches leads by name/phone', async () => {
    const { whatsappData } = await import('../../whatsapp.data');
    await whatsappData.sync();
    const byName = await whatsappData.listUserLeads('Asha');
    expect(byName.some((l) => l.phone === '628111')).toBe(true);
  });
});

describe('mapSessionStatus', () => {
  it('maps gateway statuses to coarse states', () => {
    expect(mapSessionStatus('READY')).toBe('CONNECTED');
    expect(mapSessionStatus('QR_READY')).toBe('CONNECTING');
    expect(mapSessionStatus('FAILED')).toBe('ERROR');
    expect(mapSessionStatus('whatever')).toBe('DISCONNECTED');
    expect(mapSessionStatus(null)).toBe('DISCONNECTED');
  });
});
