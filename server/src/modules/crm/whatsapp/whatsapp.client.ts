/**
 * Thin REST client for the OpenWA gateway (portals/crm/open-wa-server). All calls
 * are authenticated with the gateway's `X-API-Key` and live under its `/api`
 * global prefix. Responses are returned raw (parsed JSON); the service layer
 * normalises them into our Mongo shapes.
 */
export interface WaClient {
  createApiKey(name: string, role?: string): Promise<any>;
  createSession(name: string): Promise<any>;
  getSession(id: string): Promise<any>;
  startSession(id: string): Promise<any>;
  stopSession(id: string): Promise<any>;
  deleteSession(id: string): Promise<any>;
  getQr(id: string): Promise<any>;
  listGroups(id: string): Promise<any>;
  getGroup(id: string, groupId: string): Promise<any>;
  listContacts(id: string): Promise<any>;
  getContact(id: string, contactId: string): Promise<any>;
}

type Method = 'GET' | 'POST' | 'DELETE';

/** Pull a human-readable message out of an OpenWA error body (NestJS shape
 * `{ message, error, statusCode }`; `message` may be a string or string[]).
 * Falls back to the raw text when the body isn't JSON. */
export function parseGatewayError(text: string): string {
  try {
    const parsed = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join(', ');
    if (parsed.message) return String(parsed.message);
  } catch {
    /* not JSON — fall through to raw text */
  }
  return text.slice(0, 300);
}

export function createWaClient(baseUrl: string, apiKey: string): WaClient {
  // Prefer the internal Docker-network URL (e.g. http://open-wa:2024) for
  // server→gateway calls: the public domain resolves to the host's own IP and
  // hairpin-NAT loopback from inside a container typically fails ("fetch
  // failed"). The stored/public `baseUrl` is kept only for display/QR in the UI.
  const internal = (process.env.OPENWA_INTERNAL_URL || '').trim();
  const effective = (internal || baseUrl || '').replace(/\/+$/, '');
  const root = `${effective}/api`;
  // Prefer the stable master key (shared secret via env, accepted verbatim by the
  // gateway) over a separately-issued key — the gateway can reset its issued-key
  // store on redeploy, leaving the stored key invalid (401 "Invalid API key").
  const master = (process.env.OPENWA_API_MASTER_KEY || '').trim();
  const key = master || apiKey;

  async function req(method: Method, path: string, body?: unknown): Promise<any> {
    if (!effective || !key) {
      throw new Error('WhatsApp gateway is not configured. Set the base URL and API key first.');
    }
    const res = await fetch(`${root}${path}`, {
      method,
      headers: {
        'X-API-Key': key,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenWA ${method} ${path} failed (${res.status}): ${parseGatewayError(text)}`);
    }
    if (res.status === 204) return null;
    return res.json().catch(() => null);
  }

  return {
    createApiKey: (name, role = 'admin') => req('POST', '/auth/api-keys', { name, role }),
    createSession: (name) => req('POST', '/sessions', { name }),
    getSession: (id) => req('GET', `/sessions/${id}`),
    startSession: (id) => req('POST', `/sessions/${id}/start`),
    stopSession: (id) => req('POST', `/sessions/${id}/stop`),
    deleteSession: (id) => req('DELETE', `/sessions/${id}`),
    getQr: (id) => req('GET', `/sessions/${id}/qr`),
    listGroups: (id) => req('GET', `/sessions/${id}/groups`),
    getGroup: (id, groupId) => req('GET', `/sessions/${id}/groups/${groupId}`),
    listContacts: (id) => req('GET', `/sessions/${id}/contacts`),
    getContact: (id, contactId) => req('GET', `/sessions/${id}/contacts/${contactId}`),
  };
}

/** Map an OpenWA SessionStatus to our coarse WaStatus. */
export function mapSessionStatus(raw: string | null | undefined): 'CONNECTED' | 'CONNECTING' | 'ERROR' | 'DISCONNECTED' {
  const s = String(raw || '').toUpperCase();
  if (s === 'READY' || s === 'CONNECTED' || s === 'AUTHENTICATED') return 'CONNECTED';
  if (s === 'QR_READY' || s === 'CONNECTING' || s === 'INITIALIZING' || s === 'STARTING' || s === 'SCAN_QR_CODE')
    return 'CONNECTING';
  if (s === 'FAILED' || s === 'ERROR') return 'ERROR';
  return 'DISCONNECTED';
}
