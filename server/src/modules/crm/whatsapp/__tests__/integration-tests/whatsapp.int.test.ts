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

describe('mapSessionStatus', () => {
  it('maps gateway statuses to coarse states', () => {
    expect(mapSessionStatus('READY')).toBe('CONNECTED');
    expect(mapSessionStatus('QR_READY')).toBe('CONNECTING');
    expect(mapSessionStatus('FAILED')).toBe('ERROR');
    expect(mapSessionStatus('whatever')).toBe('DISCONNECTED');
    expect(mapSessionStatus(null)).toBe('DISCONNECTED');
  });
});
