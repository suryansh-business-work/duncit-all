import { waTimings, whatsappService } from '../../whatsapp.service';
import { mapSessionStatus } from '../../whatsapp.client';
import { apiKeyCandidates, deriveGatewayMasterKey, masterKeyCandidates } from '../../whatsapp.keys';
import { WaConnectionModel } from '../../whatsapp.model';

/**
 * OpenWA 0.31 gateway contract: generated-key lifecycle, master-key fallback,
 * stuck-session restart, engineLoaded-aware status and paged lists.
 */
type Call = { method: string; url: string; key?: string; body?: unknown };
type Reply = { status: number; body: unknown };
type Handler = (call: Call) => Reply | Promise<Reply>;

const calls: Call[] = [];
function setFetch(handler: Handler) {
  calls.length = 0;
  global.fetch = jest.fn(async (url: unknown, init: unknown) => {
    const i = (init ?? {}) as { method?: string; headers?: Record<string, string>; body?: string };
    const call: Call = {
      method: i.method ?? 'GET',
      url: String(url),
      key: i.headers?.['X-API-Key'],
      body: i.body ? JSON.parse(i.body) : undefined,
    };
    calls.push(call);
    const { status, body } = await handler(call);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    } as Response;
  }) as typeof fetch;
}

const LONG_MASTER = 'master-0123456789abcdef0123456789abcdef';
const realFetch = global.fetch;
const prevMaster = process.env.OPENWA_API_MASTER_KEY;
afterEach(() => {
  global.fetch = realFetch;
  if (prevMaster === undefined) delete process.env.OPENWA_API_MASTER_KEY;
  else process.env.OPENWA_API_MASTER_KEY = prevMaster;
});

describe('gateway master keys', () => {
  it('derives the same key as the deploy workflow (openssl HMAC-SHA256)', () => {
    // printf '%s' 'short-secret' | openssl dgst -sha256 -hmac 'duncit-openwa-master-v1'
    expect(deriveGatewayMasterKey('short-secret')).toBe(
      '9f46e2792f66b9bc632f5319766681f35d8919a007806730d39f55c7e54947e9'
    );
  });

  it('offers the derived key only when the configured secret is under 32 characters', () => {
    process.env.OPENWA_API_MASTER_KEY = 'short-secret';
    expect(masterKeyCandidates()).toEqual(['short-secret', deriveGatewayMasterKey('short-secret')]);
    process.env.OPENWA_API_MASTER_KEY = LONG_MASTER;
    expect(masterKeyCandidates()).toEqual([LONG_MASTER]);
    delete process.env.OPENWA_API_MASTER_KEY;
    expect(masterKeyCandidates()).toEqual([]);
  });

  it('puts the stored key first and drops blanks and duplicates', () => {
    process.env.OPENWA_API_MASTER_KEY = LONG_MASTER;
    expect(apiKeyCandidates('stored')).toEqual(['stored', LONG_MASTER]);
    expect(apiKeyCandidates('  ')).toEqual([LONG_MASTER]);
    expect(apiKeyCandidates(LONG_MASTER)).toEqual([LONG_MASTER]);
  });

  it('reaches a fresh gateway seeded with the derived key when the secret is short', async () => {
    process.env.OPENWA_API_MASTER_KEY = 'short-secret';
    const derived = deriveGatewayMasterKey('short-secret');
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: '' });
    setFetch(({ key }) =>
      key === derived ? { status: 200, body: { status: 'ready', engineLoaded: true } } : { status: 401, body: { message: 'Invalid API key' } }
    );
    const conn = await whatsappService.refreshStatus();
    expect(calls.map((c) => c.key)).toEqual(['short-secret', derived]);
    expect(conn.status).toBe('CONNECTED');
  });
});

describe('generated API key', () => {
  it('generateApiKey() with no input mints an admin key with the server master key and saves it', async () => {
    process.env.OPENWA_API_MASTER_KEY = LONG_MASTER;
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: '' });
    setFetch(({ url }) =>
      url.endsWith('/auth/api-keys') ? { status: 201, body: { apiKey: 'owa_k1_generated' } } : { status: 200, body: {} }
    );
    const res = await whatsappService.generateApiKey();
    expect(res.api_key).toBe('owa_k1_generated');
    expect(calls[0]).toMatchObject({ method: 'POST', key: LONG_MASTER, body: { name: 'Duncit CRM', role: 'admin' } });
    expect((await WaConnectionModel.findOne({ key: 'default' }))?.api_key).toBe('owa_k1_generated');
  });

  it('generateApiKey() fails with a clear message when the gateway returns no key', async () => {
    process.env.OPENWA_API_MASTER_KEY = LONG_MASTER;
    setFetch(() => ({ status: 201, body: { id: 'x' } }));
    await expect(whatsappService.generateApiKey({ base_url: 'https://wa.test' })).rejects.toThrow(/did not return/i);
  });

  it('connect() mints and stores a key when none is saved yet', async () => {
    process.env.OPENWA_API_MASTER_KEY = LONG_MASTER;
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: '' });
    setFetch(({ method, url }) => {
      if (url.endsWith('/auth/api-keys')) return { status: 201, body: { apiKey: 'owa_k1_auto' } };
      if (method === 'GET' && url.endsWith('/sessions')) return { status: 200, body: [{ id: 'uuid-1', name: 'duncit-crm' }] };
      return { status: 200, body: {} };
    });
    const conn = await whatsappService.connect();
    expect(conn.api_key).toBe('owa_k1_auto');
    // Session calls after minting use the new key.
    expect(calls.find((c) => c.url.endsWith('/sessions/uuid-1/start'))?.key).toBe('owa_k1_auto');
  });

  it('connect() replaces a stored key the gateway no longer accepts', async () => {
    process.env.OPENWA_API_MASTER_KEY = LONG_MASTER;
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'owa_k1_revoked' });
    setFetch(({ url, key }) => {
      if (key === 'owa_k1_revoked') return { status: 401, body: { message: 'Invalid API key' } };
      if (url.endsWith('/auth/api-keys')) return { status: 201, body: { apiKey: 'owa_k1_fresh' } };
      if (url.endsWith('/sessions')) return { status: 200, body: [{ id: 'uuid-1', name: 'duncit-crm' }] };
      return { status: 200, body: {} };
    });
    const conn = await whatsappService.connect();
    expect(conn.api_key).toBe('owa_k1_fresh');
  });

  it('connect() keeps a stored key the gateway still validates (no new key minted)', async () => {
    process.env.OPENWA_API_MASTER_KEY = LONG_MASTER;
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'owa_k1_good' });
    setFetch(({ url }) =>
      url.endsWith('/sessions') ? { status: 200, body: [{ id: 'uuid-1', name: 'duncit-crm' }] } : { status: 200, body: {} }
    );
    const conn = await whatsappService.connect();
    expect(conn.api_key).toBe('owa_k1_good');
    expect(calls.some((c) => c.url.endsWith('/auth/api-keys'))).toBe(false);
  });
});

describe('session lifecycle', () => {
  beforeEach(async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
  });

  it('connect({ restart: true }) stops the stuck engine before starting it again', async () => {
    setFetch(({ url }) =>
      url.endsWith('/sessions') ? { status: 200, body: [{ id: 'uuid-1', name: 'duncit-crm' }] } : { status: 200, body: {} }
    );
    await whatsappService.connect({ restart: true });
    const lifecycle = calls.filter((c) => /\/(stop|start)$/.test(c.url)).map((c) => c.url.split('/').pop());
    expect(lifecycle).toEqual(['stop', 'start']);
  });

  it('connect() without restart never stops the engine', async () => {
    setFetch(({ url }) =>
      url.endsWith('/sessions') ? { status: 200, body: [{ id: 'uuid-1', name: 'duncit-crm' }] } : { status: 200, body: {} }
    );
    await whatsappService.connect();
    expect(calls.some((c) => c.url.endsWith('/stop'))).toBe(false);
  });

  it('connect() accepts "already starting" and still reports CONNECTING', async () => {
    setFetch(({ url }) => {
      if (url.endsWith('/sessions')) return { status: 200, body: [{ id: 'uuid-1', name: 'duncit-crm' }] };
      if (url.endsWith('/start')) return { status: 400, body: { message: 'Session is already starting' } };
      return { status: 200, body: {} };
    });
    const conn = await whatsappService.connect();
    expect(conn.status).toBe('CONNECTING');
  });

  it('connect() surfaces any other start failure', async () => {
    setFetch(({ url }) => {
      if (url.endsWith('/sessions')) return { status: 200, body: [{ id: 'uuid-1', name: 'duncit-crm' }] };
      if (url.endsWith('/start')) return { status: 400, body: { message: 'Maximum concurrent sessions reached (1)' } };
      return { status: 200, body: {} };
    });
    await expect(whatsappService.connect()).rejects.toThrow(/Maximum concurrent sessions/);
  });

  describe('a start still booting WhatsApp Web when connect() answers', () => {
    const prevAnswerMs = waTimings.startAnswerMs;
    let finishStart: (reply: Reply) => void = () => undefined;
    const storedStatus = async () => (await WaConnectionModel.findOne({ key: 'default' }))?.status;
    const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

    beforeEach(() => {
      waTimings.startAnswerMs = 10;
      setFetch(({ url }) => {
        if (url.endsWith('/sessions')) return { status: 200, body: [{ id: 'uuid-1', name: 'duncit-crm' }] };
        if (url.endsWith('/start')) {
          return new Promise<Reply>((resolve) => {
            finishStart = resolve;
          });
        }
        return { status: 200, body: {} };
      });
    });
    afterEach(() => {
      waTimings.startAnswerMs = prevAnswerMs;
    });

    it('answers CONNECTING without waiting for the boot, then records a late failure', async () => {
      const conn = await whatsappService.connect();
      expect(conn.status).toBe('CONNECTING');
      finishStart({ status: 504, body: { message: 'WhatsApp Web authentication timed out.' } });
      await settle();
      const stored = await WaConnectionModel.findOne({ key: 'default' });
      expect(stored?.status).toBe('ERROR');
      expect(stored?.last_error).toMatch(/authentication timed out/);
    });

    it('stays CONNECTING when the slow start succeeds', async () => {
      await whatsappService.connect();
      finishStart({ status: 200, body: {} });
      await settle();
      expect(await storedStatus()).toBe('CONNECTING');
    });

    it('leaves a newer state alone when the late failure arrives after it', async () => {
      await whatsappService.connect();
      await WaConnectionModel.updateOne({ key: 'default' }, { status: 'CONNECTED' });
      finishStart({ status: 504, body: { message: 'auth timeout' } });
      await settle();
      expect(await storedStatus()).toBe('CONNECTED');
    });
  });

  it('refreshStatus() reports a stored "ready" with no engine loaded as DISCONNECTED', async () => {
    setFetch(() => ({ status: 200, body: { status: 'ready', engineLoaded: false } }));
    expect((await whatsappService.refreshStatus()).status).toBe('DISCONNECTED');
  });

  it('refreshStatus() surfaces a WhatsApp restriction as the last error', async () => {
    setFetch(() => ({
      status: 200,
      body: { status: 'failed', engineLoaded: true, lastError: null, restriction: { kind: 'tos_block', code: 'TOS_BLOCK' } },
    }));
    const conn = await whatsappService.refreshStatus();
    expect(conn.status).toBe('ERROR');
    expect(conn.last_error).toContain('tos_block');
  });
});

describe('paged gateway lists', () => {
  it('reads every page of contacts until a short page', async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
    const page = (n: number, offset: number) =>
      Array.from({ length: n }, (_v, i) => ({ id: `9198${String(offset + i).padStart(8, '0')}@c.us` }));
    setFetch(({ url }) => {
      if (url.includes('/groups?')) return { status: 200, body: [] };
      if (url.includes('/contacts?limit=1000&offset=0')) return { status: 200, body: page(1000, 0) };
      if (url.includes('/contacts?limit=1000&offset=1000')) return { status: 200, body: page(3, 1000) };
      return { status: 200, body: [] };
    });
    const { whatsappData } = await import('../../whatsapp.data');
    const res = await whatsappData.sync();
    expect(res.total).toBe(1003);
    expect(calls.filter((c) => c.url.includes('/contacts?'))).toHaveLength(2);
  }, 60000);

  it('counts @lid members as invalid instead of importing their privacy id as a phone', async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
    setFetch(({ url }) => {
      if (url.includes('/groups?')) return { status: 200, body: [] };
      if (url.includes('/contacts?')) {
        return { status: 200, body: [{ id: '919811112222@c.us', name: 'Asha' }, { id: '143267890123456@lid', number: '143267890123456' }] };
      }
      return { status: 200, body: [] };
    });
    const { whatsappData } = await import('../../whatsapp.data');
    const res = await whatsappData.sync();
    expect(res.valid).toBe(1);
    expect(res.invalid).toBe(1);
    expect((await whatsappData.listUserLeads()).items.map((l) => l.phone)).toEqual(['919811112222']);
  });
});

describe('mapSessionStatus (OpenWA 0.31 lowercase statuses)', () => {
  it.each([
    ['ready', true, 'CONNECTED'],
    ['qr_ready', true, 'CONNECTING'],
    ['initializing', true, 'CONNECTING'],
    ['authenticating', true, 'CONNECTING'],
    ['qr_ready', false, 'DISCONNECTED'],
    ['action_required', true, 'ERROR'],
    ['failed', false, 'ERROR'],
    ['disconnected', true, 'DISCONNECTED'],
  ] as const)('%s (engineLoaded=%s) → %s', (raw, engineLoaded, expected) => {
    expect(mapSessionStatus(raw, engineLoaded)).toBe(expected);
  });

  it('keeps the old behaviour when the gateway omits engineLoaded', () => {
    expect(mapSessionStatus('READY')).toBe('CONNECTED');
    expect(mapSessionStatus('QR_READY')).toBe('CONNECTING');
  });
});

/** What undici throws when nothing answers: a bare "fetch failed" with the errno in `cause`. */
const refusedConnection = () =>
  new TypeError('fetch failed', { cause: Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:2024'), { code: 'ECONNREFUSED' }) });

describe('Gateway step (saveConfig with verify)', () => {
  beforeEach(async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'owa_k1_old' });
  });

  it.each(['open-wa-server', 'ftp://wa.test', ''])('refuses the gateway URL %p and saves nothing', async (base_url) => {
    setFetch(() => ({ status: 200, body: {} }));
    await expect(whatsappService.saveConfig({ base_url, api_key: 'owa_k1_new' }, { verify: true })).rejects.toThrow(
      /starting with https:\/\/ or http:\/\//
    );
    expect(calls).toHaveLength(0);
    expect(await WaConnectionModel.findOne({ key: 'default' })).toMatchObject({ base_url: 'https://wa.test', api_key: 'owa_k1_old' });
  });

  it('asks the gateway about the new key alone, then saves URL and key', async () => {
    setFetch(({ key }) => (key === 'owa_k1_new' ? { status: 200, body: { valid: true } } : { status: 401, body: {} }));
    const conn = await whatsappService.saveConfig({ base_url: ' http://wa2.test ', api_key: ' owa_k1_new ' }, { verify: true });
    expect(calls).toEqual([{ method: 'POST', url: 'http://wa2.test/api/auth/validate', key: 'owa_k1_new', body: undefined }]);
    expect(conn).toMatchObject({ base_url: 'http://wa2.test', api_key: 'owa_k1_new' });
  });

  it('refuses a key the gateway rejects and keeps the saved one', async () => {
    process.env.OPENWA_API_MASTER_KEY = LONG_MASTER;
    setFetch(() => ({ status: 401, body: { message: 'Invalid API key' } }));
    await expect(whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'owa_k1_wrong' }, { verify: true })).rejects.toThrow(
      'The WhatsApp gateway refused this API key. Check it and try again.'
    );
    // Only the typed key is tried: the master key must not make a wrong key look right.
    expect(calls.map((c) => c.key)).toEqual(['owa_k1_wrong']);
    expect((await WaConnectionModel.findOne({ key: 'default' }))?.api_key).toBe('owa_k1_old');
  });

  it('says in words when the gateway cannot be reached', async () => {
    setFetch(() => {
      throw refusedConnection();
    });
    await expect(whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'owa_k1_new' }, { verify: true })).rejects.toThrow(
      'The WhatsApp gateway refused the connection.'
    );
  });

  it('keeps the saved key without asking the gateway when the key is left blank', async () => {
    setFetch(() => ({ status: 500, body: {} }));
    const conn = await whatsappService.saveConfig({ base_url: 'https://wa3.test' }, { verify: true });
    expect(calls).toHaveLength(0);
    expect(conn).toMatchObject({ base_url: 'https://wa3.test', api_key: 'owa_k1_old' });
  });
});

describe('connection status in words', () => {
  it('refreshStatus() stores why the gateway was unreachable instead of "fetch failed"', async () => {
    await whatsappService.saveConfig({ base_url: 'https://wa.test', api_key: 'k' });
    setFetch(() => {
      throw refusedConnection();
    });
    const conn = await whatsappService.refreshStatus();
    expect(conn.status).toBe('ERROR');
    expect(conn.last_error).toBe('The WhatsApp gateway refused the connection.');
  });

  it('disconnect() forgets the link so the CRM does not resume the session by itself', async () => {
    await WaConnectionModel.updateOne(
      { key: 'default' },
      { base_url: 'https://wa.test', api_key: 'k', status: 'CONNECTED', connected_at: new Date('2026-11-20T10:00:00Z') },
      { upsert: true }
    );
    setFetch(() => ({ status: 200, body: {} }));
    const conn = await whatsappService.disconnect();
    expect(conn.status).toBe('DISCONNECTED');
    expect(conn.connected_at).toBeNull();
  });
});
