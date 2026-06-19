/**
 * Thin REST client for the OpenWA gateway (portals/crm/open-wa-server). All calls
 * are authenticated with the gateway's `X-API-Key` and live under its `/api`
 * global prefix. Responses are returned raw (parsed JSON); the service layer
 * normalises them into our Mongo shapes.
 */
export interface WaClient {
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

export function createWaClient(baseUrl: string, apiKey: string): WaClient {
  const root = `${(baseUrl || '').replace(/\/+$/, '')}/api`;

  async function req(method: Method, path: string, body?: unknown): Promise<any> {
    if (!baseUrl || !apiKey) {
      throw new Error('WhatsApp gateway is not configured. Set the base URL and API key first.');
    }
    const res = await fetch(`${root}${path}`, {
      method,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenWA ${method} ${path} failed (${res.status}): ${text.slice(0, 300)}`);
    }
    if (res.status === 204) return null;
    return res.json().catch(() => null);
  }

  return {
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
