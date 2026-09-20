import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { getShiprocketAccount, type ShiprocketAccount } from './shiprocket.account';
import { ShiprocketSessionModel } from './shiprocketSession.model';

/**
 * The one door every ShipRocket call goes through.
 *
 * - Auth: `POST /auth/login` with the Tech portal's account; the token is kept
 *   in the database with its expiry and renewed a day before it runs out. A
 *   401 re-logs once and retries.
 * - A refused login (any 4xx) is remembered against the credential hash and
 *   never retried until the credentials change — retrying is what gets the
 *   account locked.
 * - A call answered 401 OR 403 is tried once more with a fresh token:
 *   ShipRocket phrases a token it will not honour as "Unauthorized. You do not
 *   have permission for this action.", which is also what it says when the API
 *   user really may not make that call. One login tells the two apart, and it
 *   is rationed (REAUTH_COOLDOWN_MS), so a call that is genuinely not allowed
 *   can never turn every request into a login attempt and lock the user out.
 * - Every request has a timeout. A 5xx or 429 is retried with backoff, but
 *   only for calls that are safe to repeat: re-sending "create order" after a
 *   timeout could book a second parcel.
 * - Failures are logged with the path, status and attempt — never the
 *   password, never the token.
 */
export const SR_BASE = 'https://apiv2.shiprocket.in/v1/external';

const TIMEOUT_MS = 20_000;
const RENEW_BEFORE_MS = 24 * 3_600_000;
const BACKOFF_MS = [600, 1_800];
const SESSION_KEY = 'default';
/** How long a token is trusted before a refused call may spend a login on a new one. */
const REAUTH_COOLDOWN_MS = 15 * 60_000;
/** The answers that can mean "this token is no good" as well as "you may not do this". */
const AUTH_STATUS = new Set([401, 403]);

/** What an operator has to change when ShipRocket refuses the call itself. */
const PERMISSION_HINT =
  'The API user is not allowed this call. In ShipRocket open Settings → API → Configure and create an API user (its email must not be registered on ShipRocket), save it in the Tech portal under Environment Variables → SHIPROCKET, then press Retry login here.';

export type Json = Record<string, any>;

export function shiprocketError(message: string, status = 0): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'BAD_GATEWAY', shiprocket_status: status } });
}

const sleep = (ms: number) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));

/** The expiry a ShipRocket JWT carries, or null when it cannot be read. */
function jwtExpiry(token: string): Date | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
    return Number(payload?.exp) > 0 ? new Date(Number(payload.exp) * 1000) : null;
  } catch {
    return null;
  }
}

/** ShipRocket's reason, however it phrased it (message, errors map or status). */
function reasonOf(data: Json, status: number): string {
  const raw = data?.message ?? data?.errors ?? data?.error ?? `HTTP ${status}`;
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

function refusal(message: string): GraphQLError {
  return shiprocketError(
    `ShipRocket login failed: ${message}. Fix the API user in the Tech portal or in ShipRocket, then press Retry login on E-commerce → Shipping → ShipRocket.`
  );
}

async function login(account: ShiprocketAccount): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${SR_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: account.email, password: account.password }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    logs.server.warn('shiprocket', 'login', { error, msg: 'login request failed' });
    throw shiprocketError('ShipRocket did not answer the login — try again shortly');
  }
  const data = (await res.json().catch(() => ({}))) as Json;
  if (res.ok && typeof data.token === 'string' && data.token) {
    const expires = jwtExpiry(data.token) ?? new Date(Date.now() + account.tokenTtlHours * 3_600_000);
    await ShiprocketSessionModel.updateOne(
      { key: SESSION_KEY },
      {
        $set: {
          cred_hash: account.hash,
          token: data.token,
          expires_at: expires,
          issued_at: new Date(),
          refused_hash: '',
          refused_message: '',
          refused_at: null,
        },
      },
      { upsert: true }
    );
    return data.token;
  }
  const message = reasonOf(data, res.status);
  logs.server.error('shiprocket', 'login', { status: res.status, msg: message });
  // 4xx = wrong, blocked or throttled credentials: stop. 5xx = ShipRocket's bad minute: retryable.
  if (res.status >= 400 && res.status < 500) {
    await ShiprocketSessionModel.updateOne(
      { key: SESSION_KEY },
      { $set: { refused_hash: account.hash, refused_message: message, refused_at: new Date(), token: '', expires_at: null } },
      { upsert: true }
    );
    throw refusal(message);
  }
  throw shiprocketError(`ShipRocket login failed: ${message}`, res.status);
}

/** Concurrent callers share one login instead of each spending an attempt. */
let loginInFlight: Promise<string> | null = null;

function loginOnce(account: ShiprocketAccount): Promise<string> {
  loginInFlight ??= login(account).finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

/**
 * The bearer token to use. `reauth` is a refused call asking for a new one: it
 * is granted only once the held token has had time to go stale, so a call
 * ShipRocket refuses however new the token is cannot spend a login every time.
 * The caller compares what it gets back with what it used, to see whether
 * re-sending the request is worth an attempt at all.
 */
async function token(account: ShiprocketAccount, reauth: boolean): Promise<string> {
  const session = await ShiprocketSessionModel.findOne({ key: SESSION_KEY }).select('+token').lean();
  if (session?.refused_hash === account.hash) throw refusal(session.refused_message);
  const held = session?.cred_hash === account.hash && session.token ? session.token : '';
  if (!held) return loginOnce(account);
  if (reauth) {
    const age = Date.now() - (session!.issued_at?.getTime() ?? 0);
    return age < REAUTH_COOLDOWN_MS ? held : loginOnce(account);
  }
  const live = !!session!.expires_at && session!.expires_at.getTime() - Date.now() > RENEW_BEFORE_MS;
  return live ? held : loginOnce(account);
}

/** Whether the saved credentials were refused, and why — for the admin order page and Tech portal hints. */
export async function shiprocketLoginState() {
  const account = await getShiprocketAccount();
  if (!account) return { configured: false, refused: false, message: '' };
  const session = await ShiprocketSessionModel.findOne({ key: SESSION_KEY }).lean();
  const refused = session?.refused_hash === account.hash;
  return { configured: true, refused, message: refused ? session!.refused_message : '' };
}

/**
 * One deliberate login with the saved credentials, clearing a refusal first.
 * The refusal is keyed on the credentials, so it would otherwise last until
 * they change — even when the fix was made in ShipRocket (the API user created
 * or unlocked after the credentials were saved). An operator presses this
 * once; it is never looped, so it cannot lock the account. Throws the refusal
 * again when ShipRocket still says no.
 */
export async function retryShiprocketLogin(): Promise<void> {
  const acc = await account();
  await ShiprocketSessionModel.updateOne(
    { key: SESSION_KEY },
    { $set: { refused_hash: '', refused_message: '', refused_at: null } }
  );
  await loginOnce(acc);
}

export interface RequestOptions {
  /** Safe to repeat on a 5xx/429/timeout (reads, label/manifest printing). Never for creates. */
  retry?: boolean;
  /** What the call is for, in the logs. */
  op: string;
}

async function account(): Promise<ShiprocketAccount> {
  const found = await getShiprocketAccount();
  if (!found) throw shiprocketError('ShipRocket is not configured. Add the credentials in the Tech portal.');
  return found;
}

/** Path without the query string — pincodes and AWBs stay out of the logs' grouping key. */
const route = (path: string) => path.split('?')[0];

/** One HTTP attempt; null when ShipRocket never answered (timeout, network). */
async function send(path: string, init: RequestInit, bearer: string, opts: RequestOptions, attempt: number) {
  try {
    return await fetch(`${SR_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}`, ...init.headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    logs.server.warn('shiprocket', opts.op, { error, path: route(path), attempt, msg: 'no answer' });
    return null;
  }
}

/**
 * A refusal an operator can act on: which call, which endpoint, what ShipRocket
 * said. "ShipRocket: Unauthorized" on its own names neither the step that
 * stopped nor the thing to change.
 */
async function parse<T>(res: Response, path: string, opts: RequestOptions): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as Json;
  if (res.ok) return data as T;
  const message = reasonOf(data, res.status);
  logs.server.error('shiprocket', opts.op, { status: res.status, path: route(path), msg: message });
  const said = message.replace(/\s*\.\s*$/, '');
  const hint = res.status === 403 ? ` ${PERMISSION_HINT}` : '';
  throw shiprocketError(`ShipRocket refused ${opts.op} (${route(path)}, HTTP ${res.status}): ${said}.${hint}`, res.status);
}

/**
 * One ShipRocket request. Answers the parsed body; throws a readable
 * GraphQLError (code BAD_GATEWAY) with ShipRocket's own reason otherwise.
 */
export async function srRequest<T = Json>(path: string, init: RequestInit, opts: RequestOptions): Promise<T> {
  const acc = await account();
  let bearer = await token(acc, false);
  let reauthed = false;
  for (let attempt = 0; ; attempt += 1) {
    const res = await send(path, init, bearer, opts, attempt);
    // 401 and 403 both read as "this token is no good" from here; re-sending is
    // worth an attempt only when the login handed back a different one.
    if (res && AUTH_STATUS.has(res.status) && !reauthed) {
      reauthed = true;
      const renewed = await token(acc, true);
      if (renewed !== bearer) {
        bearer = renewed;
        continue;
      }
    }
    const failed = !res || res.status === 429 || res.status >= 500;
    if (failed && opts.retry && attempt < BACKOFF_MS.length) {
      await sleep(BACKOFF_MS[attempt]);
      continue;
    }
    if (!res) throw shiprocketError(`ShipRocket did not answer (${opts.op}) — try again shortly`);
    return parse<T>(res, path, opts);
  }
}
