import { apiKeyCandidates } from './whatsapp.keys';

/**
 * Thin REST client for the OpenWA gateway (portals/crm/open-wa-server). All calls
 * are authenticated with the gateway's `X-API-Key` and live under its `/api`
 * global prefix. Responses are returned raw (parsed JSON); the service layer
 * normalises them into our Mongo shapes.
 */
/** A session as the gateway returns it (`SessionResponseDto`). */
export interface GatewaySession {
  id?: string;
  name?: string;
  status?: string;
  phone?: string | null;
  lastError?: string | null;
  restriction?: { kind?: string; code?: string } | null;
  /** Whether a gateway node runs an engine for the session right now. */
  engineLoaded?: boolean;
}

/** `GET /sessions/:id/qr` — a PNG data URL plus the lowercase session status. */
export interface GatewayQr {
  qrCode?: string | null;
  status?: string;
}

/** `POST /auth/api-keys` — the plaintext key is returned once, as `apiKey`. */
export interface GatewayCreatedKey {
  apiKey?: string;
  api_key?: string;
  key?: string;
}

/** `GET /sessions/:id/groups/:groupId` — group info with its participants. */
export interface GatewayGroupDetail {
  participants?: unknown[];
  members?: unknown[];
}

export interface WaClient {
  createApiKey(name: string, role?: string): Promise<GatewayCreatedKey | null>;
  validateKey(): Promise<unknown>;
  listSessions(): Promise<unknown>;
  createSession(name: string): Promise<GatewaySession | null>;
  getSession(id: string): Promise<GatewaySession | null>;
  startSession(id: string): Promise<unknown>;
  stopSession(id: string): Promise<unknown>;
  deleteSession(id: string): Promise<unknown>;
  getQr(id: string): Promise<GatewayQr | null>;
  listGroups(id: string): Promise<unknown[]>;
  getGroup(id: string, groupId: string): Promise<GatewayGroupDetail | null>;
  listContacts(id: string): Promise<unknown[]>;
  getContact(id: string, contactId: string): Promise<unknown>;
}

type Method = 'GET' | 'POST' | 'DELETE';

/** The gateway pages group/contact lists at 1000 rows; keep reading until a short page. */
const LIST_PAGE_SIZE = 1000;
/** Upper bound on pages per list so a misbehaving gateway can't loop us forever. */
const LIST_MAX_PAGES = 50;

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

/**
 * Client authenticated with an explicit, ordered key list. A `401` moves on to
 * the next key, so a stale generated key falls back to the master key.
 */
export function createWaClientWithKeys(baseUrl: string, keys: string[]): WaClient {
  // Prefer the internal Docker-network URL (e.g. http://open-wa:2024) for
  // server→gateway calls: the public domain resolves to the host's own IP and
  // hairpin-NAT loopback from inside a container typically fails ("fetch
  // failed"). The stored/public `baseUrl` is kept only for display in the UI.
  const internal = (process.env.OPENWA_INTERNAL_URL || '').trim();
  const effective = (internal || baseUrl || '').replace(/\/+$/, '');
  const root = `${effective}/api`;

  async function send(method: Method, path: string, key: string, body?: unknown) {
    return fetch(`${root}${path}`, {
      method,
      headers: { 'X-API-Key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  /** Parsed JSON body; the gateway's response shapes are documented by the interfaces above. */
  async function req<T = unknown>(method: Method, path: string, body?: unknown): Promise<T | null> {
    if (!effective || keys.length === 0) {
      throw new Error('WhatsApp gateway is not configured. Set the base URL and API key first.');
    }
    let res = await send(method, path, keys[0], body);
    for (let i = 1; res.status === 401 && i < keys.length; i += 1) {
      res = await send(method, path, keys[i], body);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenWA ${method} ${path} failed (${res.status}): ${parseGatewayError(text)}`);
    }
    if (res.status === 204) return null;
    return (await res.json().catch(() => null)) as T | null;
  }

  async function listAll(path: string): Promise<unknown[]> {
    const rows: unknown[] = [];
    for (let page = 0; page < LIST_MAX_PAGES; page += 1) {
      const res = await req('GET', `${path}?limit=${LIST_PAGE_SIZE}&offset=${page * LIST_PAGE_SIZE}`);
      const batch: unknown[] = Array.isArray(res) ? res : [];
      rows.push(...batch);
      if (batch.length < LIST_PAGE_SIZE) break;
    }
    return rows;
  }

  return {
    createApiKey: (name, role = 'admin') => req<GatewayCreatedKey>('POST', '/auth/api-keys', { name, role }),
    validateKey: () => req('POST', '/auth/validate'),
    listSessions: () => req('GET', '/sessions'),
    createSession: (name) => req<GatewaySession>('POST', '/sessions', { name }),
    getSession: (id) => req<GatewaySession>('GET', `/sessions/${id}`),
    startSession: (id) => req('POST', `/sessions/${id}/start`),
    stopSession: (id) => req('POST', `/sessions/${id}/stop`),
    deleteSession: (id) => req('DELETE', `/sessions/${id}`),
    getQr: (id) => req<GatewayQr>('GET', `/sessions/${id}/qr`),
    listGroups: (id) => listAll(`/sessions/${id}/groups`),
    getGroup: (id, groupId) => req<GatewayGroupDetail>('GET', `/sessions/${id}/groups/${groupId}`),
    listContacts: (id) => listAll(`/sessions/${id}/contacts`),
    getContact: (id, contactId) => req('GET', `/sessions/${id}/contacts/${contactId}`),
  };
}

/** Client that sends the stored (generated) key first, then the master key(s). */
export function createWaClient(baseUrl: string, apiKey: string): WaClient {
  return createWaClientWithKeys(baseUrl, apiKeyCandidates(apiKey));
}

const CONNECTED_STATES = new Set(['READY', 'CONNECTED', 'AUTHENTICATED']);
const PENDING_STATES = new Set([
  'QR_READY',
  'CONNECTING',
  'INITIALIZING',
  'STARTING',
  'SCAN_QR_CODE',
  'AUTHENTICATING',
]);
const ERROR_STATES = new Set(['FAILED', 'ERROR', 'ACTION_REQUIRED']);

/**
 * Map an OpenWA session status to our coarse WaStatus. `engineLoaded: false`
 * means no engine runs the session (e.g. right after a redeploy), so a stored
 * "ready"/"qr_ready" is stale and the session must be started again.
 */
export function mapSessionStatus(
  raw: string | null | undefined,
  engineLoaded?: boolean | null
): 'CONNECTED' | 'CONNECTING' | 'ERROR' | 'DISCONNECTED' {
  const s = String(raw || '').toUpperCase();
  if (ERROR_STATES.has(s)) return 'ERROR';
  const live = CONNECTED_STATES.has(s) || PENDING_STATES.has(s);
  if (live && engineLoaded === false) return 'DISCONNECTED';
  if (CONNECTED_STATES.has(s)) return 'CONNECTED';
  if (PENDING_STATES.has(s)) return 'CONNECTING';
  return 'DISCONNECTED';
}
