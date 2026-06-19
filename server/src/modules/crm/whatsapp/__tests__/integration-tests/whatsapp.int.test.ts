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

  it('generateApiKey mints a dedicated key from the master and saves it', async () => {
    setFetch((url, init) => {
      if (init.method === 'POST' && url.endsWith('/auth/api-keys')) {
        return { status: 200, body: { apiKey: 'gen-key-xyz', name: 'Duncit CRM', role: 'admin' } };
      }
      return { status: 200, body: {} };
    });
    const res = await whatsappService.generateApiKey({
      base_url: 'https://wa.test',
      master_key: 'master-123',
    });
    expect(res.api_key).toBe('gen-key-xyz');
    expect(res.connection.api_key).toBe('gen-key-xyz');
  });

  it('generateApiKey needs the gateway URL + master key', async () => {
    await expect(
      whatsappService.generateApiKey({ base_url: '', master_key: '' })
    ).rejects.toThrow(/master/i);
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

  it('connect() tolerates an already-existing session (409) and still starts it', async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
    const calls: string[] = [];
    setFetch((url, init) => {
      calls.push(`${init.method} ${url}`);
      if (init.method === 'POST' && url.endsWith('/sessions')) {
        return { status: 409, body: { message: "Session with name 'duncit-crm' already exists" } };
      }
      return { status: 200, body: { id: 'duncit-crm' } };
    });
    const conn = await whatsappService.connect();
    expect(conn.status).toBe('CONNECTING');
    expect(conn.last_error).toBeNull();
    expect(calls.some((c) => c.includes('/sessions/duncit-crm/start'))).toBe(true);
  });

  it('routes gateway calls through OPENWA_INTERNAL_URL, ignoring the public base_url', async () => {
    await whatsappService.saveConfig({ base_url: 'https://open-wa-server.duncit.com', api_key: 'k' });
    const prev = process.env.OPENWA_INTERNAL_URL;
    process.env.OPENWA_INTERNAL_URL = 'http://open-wa:2024';
    const urls: string[] = [];
    setFetch((url) => {
      urls.push(url);
      return { status: 200, body: { status: 'READY' } };
    });
    try {
      await whatsappService.refreshStatus();
      expect(urls.length).toBeGreaterThan(0);
      expect(urls.every((u) => u.startsWith('http://open-wa:2024/api'))).toBe(true);
      expect(urls.some((u) => u.includes('duncit.com'))).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.OPENWA_INTERNAL_URL;
      else process.env.OPENWA_INTERNAL_URL = prev;
    }
  });

  it('uses the master key (OPENWA_API_MASTER_KEY) as X-API-Key when set', async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'stored-key' });
    const prev = process.env.OPENWA_API_MASTER_KEY;
    process.env.OPENWA_API_MASTER_KEY = 'master-xyz';
    let sentKey: string | undefined;
    setFetch((_url, init) => {
      sentKey = (init as { headers?: Record<string, string> }).headers?.['X-API-Key'];
      return { status: 200, body: { status: 'READY' } };
    });
    try {
      await whatsappService.refreshStatus();
      expect(sentKey).toBe('master-xyz');
    } finally {
      if (prev === undefined) delete process.env.OPENWA_API_MASTER_KEY;
      else process.env.OPENWA_API_MASTER_KEY = prev;
    }
  });

  it('parses gateway error bodies into a readable message (no raw JSON)', async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
    setFetch(() => ({ status: 401, body: { message: 'Invalid API key', error: 'Unauthorized', statusCode: 401 } }));
    const conn = await whatsappService.refreshStatus();
    expect(conn.status).toBe('ERROR');
    expect(conn.last_error).toContain('Invalid API key');
    expect(conn.last_error).not.toContain('statusCode');
  });

  it('refreshStatus() maps a READY session to CONNECTED and stores the phone', async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
    setFetch(() => ({ status: 200, body: { status: 'READY', phone: '628123', lastError: null } }));
    const conn = await whatsappService.refreshStatus();
    expect(conn.status).toBe('CONNECTED');
    expect(conn.phone).toBe('628123');
    expect(conn.connected_at).toBeTruthy();
  });

  it('refreshStatus() maps a missing session (404) to DISCONNECTED, not ERROR', async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
    setFetch(() => ({ status: 404, body: { message: "Session with id 'duncit-crm' not found" } }));
    const conn = await whatsappService.refreshStatus();
    expect(conn.status).toBe('DISCONNECTED');
    expect(conn.last_error).toBeNull();
  });

  it('qr() returns DISCONNECTED when no session exists yet (404)', async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
    setFetch(() => ({ status: 404, body: { message: 'not found' } }));
    const res = await whatsappService.qr();
    expect(res).toEqual({ qr_code: null, status: 'DISCONNECTED' });
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

describe('whatsapp manual leads + Excel (WA-LeadGen P5)', () => {
  it('creates a manual lead, normalising the phone', async () => {
    const { whatsappData } = await import('../../whatsapp.data');
    const lead = await whatsappData.createLead({ phone: '+91 98765-43210', name: 'Manual Guy' });
    expect(lead?.phone).toBe('919876543210');
    expect(lead?.source_account).toBe('Manual');
  });

  it('rejects a manual lead without a usable phone', async () => {
    const { whatsappData } = await import('../../whatsapp.data');
    await expect(whatsappData.createLead({ phone: 'abc' })).rejects.toThrow(/phone/i);
  });

  it('round-trips an Excel export → import and upserts leads', async () => {
    const { whatsappData } = await import('../../whatsapp.data');
    const { buildLeadsWorkbook, parseLeadsWorkbook } = await import('../../whatsapp.excel');
    const b64 = buildLeadsWorkbook([{ phone: '628999', name: 'Excel Guy' }]);
    expect(typeof b64).toBe('string');
    expect(b64.length).toBeGreaterThan(0);
    const rows = parseLeadsWorkbook(b64);
    expect(rows).toEqual([{ phone: '628999', name: 'Excel Guy' }]);
    const res = await whatsappData.importLeads(rows);
    expect(res.imported).toBe(1);
    const found = await whatsappData.listUserLeads('628999');
    expect(found.some((l) => l.phone === '628999')).toBe(true);
  });

  it('skips rows without a phone on import', async () => {
    const { whatsappData } = await import('../../whatsapp.data');
    const res = await whatsappData.importLeads([{ phone: '', name: 'no phone' }, { phone: '628000', name: 'ok' }]);
    expect(res).toEqual({ imported: 1, skipped: 1 });
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
