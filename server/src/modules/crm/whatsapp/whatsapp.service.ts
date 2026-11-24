import { logs } from '@observability/log';
import { humanFetchMessage } from '@utils/outboundFetch';
import { WaConnectionModel } from './whatsapp.model';
import { createWaClient, createWaClientWithKeys, mapSessionStatus, type WaClient } from './whatsapp.client';
import { masterKeyCandidates } from './whatsapp.keys';

const KEY = 'default';
/** Human-friendly name of our single WhatsApp session on the gateway. The
 * gateway keys sessions by a generated UUID `id` (not the name), so we resolve
 * that id at connect time and persist it in WaConnection.session_id. */
const SESSION_NAME = 'duncit-crm';
/** Name shown in the gateway's key list for the key the CRM mints. */
const GENERATED_KEY_NAME = 'Duncit CRM';

/** Load (or lazily create) the single gateway connection config doc. Returns the
 * hydrated Mongoose document (so callers can `.save()`). */
async function getConnection() {
  const existing = await WaConnectionModel.findOne({ key: KEY });
  if (existing) return existing;
  return WaConnectionModel.create({ key: KEY });
}

/** The reason in words: a bare undici "fetch failed" becomes "… could not be reached" and the like. */
const errorMessage = (error: unknown): string =>
  humanFetchMessage('The WhatsApp gateway', error) ?? (error instanceof Error ? error.message : '');

/** True when the gateway answered 401/403: it is up, but refuses the key. */
const isAuthRefusal = (error: unknown): boolean => /\((401|403)\)/.test(errorMessage(error));

/** Only http(s) gateway URLs are accepted; anything else could not be fetched anyway. */
function assertGatewayUrl(baseUrl: string): void {
  let protocol = '';
  try {
    protocol = new URL(baseUrl).protocol;
  } catch {
    /* not a URL — refused below */
  }
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error('Enter the gateway URL in full, starting with https:// or http://.');
  }
}

/** Prove a key works on the gateway before it is saved, so step 1 fails with the real reason. */
async function verifyApiKey(baseUrl: string, apiKey: string): Promise<void> {
  try {
    await createWaClientWithKeys(baseUrl, [apiKey]).validateKey();
  } catch (error) {
    if (isAuthRefusal(error)) throw new Error('The WhatsApp gateway refused this API key. Check it and try again.');
    throw new Error(errorMessage(error) || 'The WhatsApp gateway could not check this API key.');
  }
}

/** True when an OpenWA error is a 409 "session already exists" — a harmless
 * no-op for us, since the gateway persists sessions across restarts. */
function isAlreadyExists(error: unknown): boolean {
  const msg = errorMessage(error);
  return msg.includes('(409)') || /already exists/i.test(msg);
}

/** True when an OpenWA error is a 404 "session not found" — the session simply
 * hasn't been created yet (e.g. before the first connect, or after a gateway
 * redeploy reset its store). That's DISCONNECTED, not an error. */
function isNotFound(error: unknown): boolean {
  const msg = errorMessage(error);
  return msg.includes('(404)') || /not found/i.test(msg);
}

/** True when a start was refused only because the engine is already up. */
function isAlreadyRunning(error: unknown): boolean {
  return /already (started|starting|authenticated|exists)/i.test(errorMessage(error));
}

/**
 * How long connect() waits on the gateway's start before answering. A start fails fast for a refusal
 * (e.g. the concurrent-session cap), but booting WhatsApp Web can take minutes, longer than a request
 * should hang, so a start still running after this carries on in the background while the portal polls
 * the QR. Held in an object so tests can shorten it.
 */
export const waTimings = { startAnswerMs: 8_000 };

/** Record a start that failed after connect() already answered, unless a newer state replaced CONNECTING. */
function recordLateStartFailure(error: unknown): void {
  if (isAlreadyRunning(error)) return;
  logs.server.warn('crm.whatsapp', 'connect.start', { error });
  WaConnectionModel.updateOne(
    { key: KEY, status: 'CONNECTING' },
    { status: 'ERROR', last_error: errorMessage(error) || 'Starting the WhatsApp session failed.' }
  ).catch((saveError: unknown) => logs.server.warn('crm.whatsapp', 'connect.recordFailure', { error: saveError }));
}

/** Start the session engine: throws a refusal that arrives within the answer window, otherwise lets it run on. */
async function startEngine(client: WaClient, sessionId: string): Promise<void> {
  const started = client.startSession(sessionId).then(
    () => 'started' as const,
    (error: unknown) => {
      if (!isAlreadyRunning(error)) throw error;
      return 'started' as const;
    }
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stillBooting = new Promise<'booting'>((resolve) => {
    timer = setTimeout(() => resolve('booting'), waTimings.startAnswerMs);
  });
  try {
    if ((await Promise.race([started, stillBooting])) === 'booting') started.catch(recordLateStartFailure);
  } finally {
    clearTimeout(timer);
  }
}

/** Find our session's gateway id (a UUID) by its name. */
async function findSessionIdByName(client: WaClient): Promise<string | undefined> {
  const list = await client.listSessions().catch(() => []);
  const sessions: { id?: string; name?: string }[] = Array.isArray(list) ? list : [];
  return sessions.find((s) => s.name === SESSION_NAME)?.id;
}

/** Resolve the gateway session id for SESSION_NAME, creating the session if it
 * doesn't exist yet. Returns the gateway's generated UUID id. */
async function resolveSessionId(client: WaClient): Promise<string> {
  const existing = await findSessionIdByName(client);
  if (existing) return existing;
  try {
    const created = await client.createSession(SESSION_NAME);
    if (created?.id) return created.id as string;
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
  }
  const afterCreate = await findSessionIdByName(client);
  if (afterCreate) return afterCreate;
  throw new Error('Could not resolve the WhatsApp session from the gateway.');
}

/** Mint an ADMIN key on the gateway with the given client and return it. */
async function mintKey(client: WaClient): Promise<string> {
  const created = await client.createApiKey(GENERATED_KEY_NAME, 'admin');
  const apiKey = created?.apiKey ?? created?.api_key ?? created?.key;
  if (!apiKey) throw new Error('The gateway did not return an API key.');
  return String(apiKey);
}

/** Readable reason for a session WhatsApp itself restricted (e.g. `tos_block`). */
function restrictionMessage(restriction: { kind?: string; code?: string } | null | undefined): string | null {
  if (!restriction?.kind) return null;
  return `WhatsApp restricted this account (${restriction.kind}${restriction.code ? `: ${restriction.code}` : ''}).`;
}

export interface WaConfigInput {
  base_url?: string;
  api_key?: string;
  session_id?: string;
}

export interface WaGenerateKeyInput {
  base_url?: string | null;
  master_key?: string | null;
}

export const whatsappService = {
  getConnection,

  /**
   * Save the gateway base URL / API key / session id (partial update). With `verify`
   * (the CRM's Gateway step) the URL must be http(s) and a new key must be accepted by
   * the gateway, so a wrong key fails here instead of at Connect.
   */
  async saveConfig(input: WaConfigInput, options: { verify?: boolean } = {}) {
    const conn = await getConnection();
    if (options.verify) {
      const baseUrl = input.base_url === undefined ? conn.base_url : input.base_url.trim();
      if (input.base_url !== undefined) assertGatewayUrl(baseUrl);
      const apiKey = (input.api_key ?? '').trim();
      if (apiKey) await verifyApiKey(baseUrl, apiKey);
    }
    if (input.base_url !== undefined) conn.base_url = input.base_url.trim();
    if (input.api_key !== undefined) conn.api_key = input.api_key.trim();
    if (input.session_id) conn.session_id = input.session_id.trim();
    await conn.save();
    return conn;
  },

  /**
   * Mint a dedicated gateway API key and save it as the connection's key. With
   * no `master_key` the server's own OPENWA_API_MASTER_KEY is used, so nobody
   * has to fetch a key from the server by hand. An explicit `master_key` is
   * still accepted (older CRM builds send one). Returns the new key once.
   */
  async generateApiKey(input: WaGenerateKeyInput = {}) {
    const conn = await getConnection();
    const baseUrl = (input.base_url ?? '').trim() || conn.base_url;
    const explicit = (input.master_key ?? '').trim();
    const masters = explicit ? [explicit] : masterKeyCandidates();
    if (masters.length === 0) {
      throw new Error('No gateway master key: set OPENWA_API_MASTER_KEY on the server or enter the master key.');
    }
    const apiKey = await mintKey(createWaClientWithKeys(baseUrl, masters));
    const saved = await this.saveConfig({ base_url: baseUrl, api_key: apiKey });
    return { connection: saved, api_key: apiKey };
  },

  /**
   * Make sure the connection holds a working generated key: keep a stored key
   * the gateway still accepts, otherwise mint one from the master key. Best
   * effort — the client falls back to the master key, so a failure here never
   * blocks connecting; it is logged for diagnosis.
   */
  async ensureApiKey() {
    const conn = await getConnection();
    const masters = masterKeyCandidates();
    if (conn.api_key) {
      const ok = await createWaClientWithKeys(conn.base_url, [conn.api_key])
        .validateKey()
        .then(() => true)
        .catch(() => false);
      if (ok || masters.length === 0) return conn;
    }
    if (masters.length === 0) return conn;
    try {
      conn.api_key = await mintKey(createWaClientWithKeys(conn.base_url, masters));
      await conn.save();
    } catch (error) {
      logs.server.warn('crm.whatsapp', 'ensureApiKey', { error });
    }
    return conn;
  },

  /**
   * Ensure the OpenWA session exists and its engine runs, then mark CONNECTING.
   * `restart` stops the engine first — the way out of a session stuck before
   * its QR. The gateway persists the session, so a scanned account survives.
   */
  async connect(options: { restart?: boolean } = {}) {
    const conn = await this.ensureApiKey();
    const client = createWaClient(conn.base_url, conn.api_key);
    // Resolve the gateway's real session id (UUID) by name, creating it if
    // needed, and persist it — start/qr/status all key off this id, not the name.
    const sessionId = await resolveSessionId(client);
    conn.session_id = sessionId;
    if (options.restart) {
      await client.stopSession(sessionId).catch((error) => {
        logs.server.warn('crm.whatsapp', 'restart.stop', { error });
      });
    }
    // Start the engine. "Already started/starting" is fine; a quick refusal is
    // surfaced so the user sees why it didn't connect, a slow boot runs on.
    await startEngine(client, sessionId);
    conn.status = 'CONNECTING';
    conn.last_error = null;
    await conn.save();
    return conn;
  },

  /** Pull the live session status from the gateway and persist it. */
  async refreshStatus() {
    const conn = await getConnection();
    if (!conn.base_url && !process.env.OPENWA_INTERNAL_URL) return conn;
    if (!conn.api_key && masterKeyCandidates().length === 0) return conn;
    const client = createWaClient(conn.base_url, conn.api_key);
    try {
      const session = await client.getSession(conn.session_id);
      conn.status = mapSessionStatus(session?.status, session?.engineLoaded);
      if (session?.phone) conn.phone = session.phone;
      if (conn.status === 'CONNECTED' && !conn.connected_at) conn.connected_at = new Date();
      conn.last_error = session?.lastError ?? restrictionMessage(session?.restriction);
    } catch (error) {
      if (isNotFound(error)) {
        conn.status = 'DISCONNECTED';
        conn.last_error = null;
      } else {
        conn.status = 'ERROR';
        conn.last_error = errorMessage(error) || 'Status check failed';
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
      const msg = errorMessage(error);
      // No session / engine not started → the portal starts it.
      if (isNotFound(error) || /not started/i.test(msg)) return { qr_code: null, status: 'DISCONNECTED' };
      // Session is booting but the QR hasn't been emitted yet → keep polling.
      if (/not ready/i.test(msg)) return { qr_code: null, status: 'CONNECTING' };
      // Account already linked → no QR needed.
      if (/already authenticated/i.test(msg)) return { qr_code: null, status: 'CONNECTED' };
      throw error;
    }
  },

  /**
   * Stop the session and mark disconnected (does not delete persisted auth). Clearing
   * `connected_at` records that a person chose to disconnect, so the CRM does not
   * resume this session by itself the next time the page opens.
   */
  async disconnect() {
    const conn = await getConnection();
    const client = createWaClient(conn.base_url, conn.api_key);
    await client.stopSession(conn.session_id).catch((error) => {
      logs.server.warn('crm.whatsapp', 'disconnect.stop', { error });
    });
    conn.status = 'DISCONNECTED';
    conn.connected_at = null;
    await conn.save();
    return conn;
  },
};
