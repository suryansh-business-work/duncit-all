import { WaConnectionModel } from './whatsapp.model';
import { createWaClient, mapSessionStatus } from './whatsapp.client';

const KEY = 'default';

/** Load (or lazily create) the single gateway connection config doc. Returns the
 * hydrated Mongoose document (so callers can `.save()`). */
async function getConnection() {
  const existing = await WaConnectionModel.findOne({ key: KEY });
  if (existing) return existing;
  return WaConnectionModel.create({ key: KEY });
}

/** True when an OpenWA error is a 409 "session already exists" — a harmless
 * no-op for us, since the gateway persists sessions across restarts. */
function isAlreadyExists(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : '';
  return msg.includes('(409)') || /already exists/i.test(msg);
}

/** True when an OpenWA error is a 404 "session not found" — the session simply
 * hasn't been created yet (e.g. before the first connect, or after a gateway
 * redeploy reset its store). That's DISCONNECTED, not an error. */
function isNotFound(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : '';
  return msg.includes('(404)') || /not found/i.test(msg);
}

export interface WaConfigInput {
  base_url?: string;
  api_key?: string;
  session_id?: string;
}

export const whatsappService = {
  getConnection,

  /** Save the gateway base URL / API key / session id (partial update). */
  async saveConfig(input: WaConfigInput) {
    const conn = await getConnection();
    if (input.base_url !== undefined) conn.base_url = input.base_url.trim();
    if (input.api_key !== undefined) conn.api_key = input.api_key.trim();
    if (input.session_id) conn.session_id = input.session_id.trim();
    await conn.save();
    return conn;
  },

  /** Mint a dedicated gateway API key using the supplied master/admin key, then
   * save it as the connection's key. Returns the new key once (for the user to
   * copy) plus the updated connection. */
  async generateApiKey(input: { base_url: string; master_key: string }) {
    const baseUrl = input.base_url.trim();
    const master = input.master_key.trim();
    if (!baseUrl || !master) {
      throw new Error('Enter the gateway URL and your master/admin API key first.');
    }
    const client = createWaClient(baseUrl, master);
    const created = await client.createApiKey('Duncit CRM', 'admin');
    const apiKey = created?.apiKey ?? created?.api_key ?? created?.key;
    if (!apiKey) throw new Error('The gateway did not return an API key.');
    const conn = await this.saveConfig({ base_url: baseUrl, api_key: apiKey });
    return { connection: conn, api_key: apiKey as string };
  },

  /** Ensure the OpenWA session exists + is started, then mark CONNECTING. The
   * gateway persists the session so a scanned account survives restarts. */
  async connect() {
    const conn = await getConnection();
    const client = createWaClient(conn.base_url, conn.api_key);
    // Idempotent: ensure the session exists, then start it. Creating a session
    // that already exists returns 409 — that's the desired state, not an error.
    try {
      await client.createSession(conn.session_id);
    } catch (error) {
      if (!isAlreadyExists(error)) throw error;
    }
    // Start the engine (launches Chromium + whatsapp-web). "Already started" is
    // fine; surface any other failure so the user sees why it didn't connect.
    await client.startSession(conn.session_id).catch((error) => {
      const msg = error instanceof Error ? error.message : '';
      if (!/already (started|authenticated|exists)/i.test(msg)) throw error;
    });
    conn.status = 'CONNECTING';
    conn.last_error = null;
    await conn.save();
    return conn;
  },

  /** Pull the live session status from the gateway and persist it. */
  async refreshStatus() {
    const conn = await getConnection();
    if (!conn.base_url || !conn.api_key) return conn;
    const client = createWaClient(conn.base_url, conn.api_key);
    try {
      const session = await client.getSession(conn.session_id);
      conn.status = mapSessionStatus(session?.status);
      if (session?.phone) conn.phone = session.phone;
      if (conn.status === 'CONNECTED' && !conn.connected_at) conn.connected_at = new Date();
      conn.last_error = session?.lastError ?? null;
    } catch (error) {
      if (isNotFound(error)) {
        conn.status = 'DISCONNECTED';
        conn.last_error = null;
      } else {
        conn.status = 'ERROR';
        conn.last_error = error instanceof Error ? error.message : 'Status check failed';
      }
    }
    await conn.save();
    return conn;
  },

  /** Current QR (data URL) to scan, plus the session status. */
  async qr(): Promise<{ qr_code: string | null; status: string }> {
    const conn = await getConnection();
    const client = createWaClient(conn.base_url, conn.api_key);
    try {
      const res = await client.getQr(conn.session_id);
      return { qr_code: res?.qrCode ?? null, status: mapSessionStatus(res?.status) };
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      // No session / engine not started → prompt the user to connect.
      if (isNotFound(error) || /not started/i.test(msg)) return { qr_code: null, status: 'DISCONNECTED' };
      // Session is booting but the QR hasn't been emitted yet → keep polling.
      if (/not ready/i.test(msg)) return { qr_code: null, status: 'CONNECTING' };
      // Account already linked → no QR needed.
      if (/already authenticated/i.test(msg)) return { qr_code: null, status: 'CONNECTED' };
      throw error;
    }
  },

  /** Stop the session and mark disconnected (does not delete persisted auth). */
  async disconnect() {
    const conn = await getConnection();
    const client = createWaClient(conn.base_url, conn.api_key);
    await client.stopSession(conn.session_id).catch(() => undefined);
    conn.status = 'DISCONNECTED';
    await conn.save();
    return conn;
  },
};
