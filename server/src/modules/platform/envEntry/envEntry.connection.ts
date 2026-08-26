import {
  campaignEndpoint,
  campaignErrorReason,
  campaignPayload,
  campaignSucceeded,
} from '@modules/platform/aisensy/aisensy.gateway';
import { describeFetchError } from '@modules/platform/aisensy/aisensy.transport';
import { missingBotScopes } from '@modules/platform/slack/slack.gateway';

/**
 * "Does this credential actually work?" for the providers where the answer
 * cannot be read off the value.
 *
 * A key that is present, well-formed and the right length still fails at the
 * vendor — wrong account, wrong environment, revoked, or missing a scope. Each
 * check here makes ONE authenticated call to the vendor and reports what came
 * back, so a misconfiguration is found in the Tech portal rather than in the
 * first user-facing feature that needs it.
 *
 * Deliberately PURE: it reads a config through {@link EnvConfigReader}, touches
 * no database and imports nothing from `envEntry.service`, which is what lets
 * the service's `ENV_PROBES` map point straight at these functions instead of
 * keeping a second, quietly diverging copy of each vendor's call (rule 34).
 * The DB-aware half — loading the entry, resolving a destination, stamping the
 * outcome — lives in `envEntry.tests.ts`.
 *
 * Two rules hold for every check:
 *  - NEVER put a credential in `message` or `details`. Both are shown in the
 *    portal and written to the entry's test history.
 *  - ALWAYS bound the call. A vendor that accepts the connection and never
 *    answers would otherwise hold a GraphQL request open until the proxy gives
 *    up, which is indistinguishable from a broken server.
 */

/** No vendor gets longer than this to answer a credential check. */
const TIMEOUT_MS = 12_000;

/** One config value as a string. An entry field is only ever a scalar. */
export type EnvConfigReader = (key: string) => string;

export interface EnvConnectionResult {
  ok: boolean;
  /** The headline an operator reads first. Never contains a credential. */
  message: string;
  /**
   * Everything else worth knowing — granted scopes, live-vs-test mode, token
   * lifetime. Separate from `message` so the UI can list it without turning the
   * headline into a paragraph. Never contains a credential.
   */
  details: string[];
}

/** Options a caller may supply; today only AiSensy needs one. */
export interface EnvConnectionOptions {
  /**
   * Where AiSensy should send the test WhatsApp message — country code +
   * number, digits only. AiSensy's campaign API is the only call its key can
   * make, so proving the key means actually sending.
   */
  to?: string;
}

interface HttpAnswer {
  status: number;
  ok: boolean;
  data: Record<string, any>;
  /** Null-safe response header read — a stubbed fetch may carry no headers. */
  header: (name: string) => string | null;
}

/** One JSON call, abandoned if the vendor never answers. */
async function fetchJson(url: string, init: RequestInit): Promise<HttpAnswer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    // A gateway error page is HTML, not JSON; the status still has to survive.
    const data = (await res.json().catch(() => ({}))) as Record<string, any>;
    const headers: { get?: (name: string) => string | null } | undefined = res.headers;
    return { status: res.status, ok: res.ok, data, header: (name) => headers?.get?.(name) ?? null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Expiry (ms) claimed by a JWT, 0 when it carries none, null when it isn't a
 * decodable JWT. Catches a key that expired weeks ago before its first send
 * fails, and turns a ShipRocket login into "valid until <date>".
 */
function jwtExpiryMs(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    return typeof claims?.exp === 'number' ? claims.exp * 1000 : 0;
  } catch {
    return null;
  }
}

/** "Token valid until <date>" when the token says so, else what it does say. */
function tokenLifetime(token: string): string {
  const expiry = jwtExpiryMs(token);
  if (expiry === null) return 'Token issued (opaque — it carries no readable expiry)';
  if (expiry === 0) return 'Token issued with no expiry claim';
  return `Token valid until ${new Date(expiry).toUTCString()}`;
}

// --- Slack ------------------------------------------------------------------

const SLACK_REINSTALL_HINT =
  'Add the scope at api.slack.com/apps -> your app -> OAuth & Permissions -> Bot Token Scopes, then reinstall the app to the workspace and paste the new token here.';

/**
 * `auth.test` — the cheapest call that proves a bot token, and the only one
 * that needs no scope at all.
 *
 * Slack answers HTTP 200 for everything, so the body's `ok` flag decides. A
 * valid token with too few scopes still fails every real call with
 * `missing_scope`, so the granted scopes are checked here rather than at the
 * first screen that breaks. Slack reports them in a response header; when that
 * header is absent we cannot judge and do not guess.
 */
export async function slackConnection(str: EnvConfigReader): Promise<EnvConnectionResult> {
  if (!str('bot_token')) return { ok: false, message: 'Bot token is required', details: [] };

  const res = await fetchJson('https://slack.com/api/auth.test', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${str('bot_token')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  if (!res.data.ok) {
    const reason = res.data.error ? `: ${res.data.error}` : '';
    return { ok: false, message: `Slack rejected the token${reason}`, details: [] };
  }

  const team = String(res.data.team ?? '');
  const details: string[] = [];
  if (res.data.user) details.push(`Authenticated as ${String(res.data.user)}`);

  const granted = res.header('x-oauth-scopes');
  if (granted === null) {
    details.push('Slack did not report the token scopes — channel listing may still fail.');
    return { ok: true, message: `Slack workspace "${team}" connected`, details };
  }

  const missing = missingBotScopes(granted);
  if (missing.length > 0) {
    details.push(SLACK_REINSTALL_HINT);
    return {
      ok: false,
      message: `Slack token is valid but the bot is missing the scope ${missing.join(', ')}`,
      details,
    };
  }
  details.push('All scopes needed for listing channels and posting are granted.');
  return { ok: true, message: `Slack workspace "${team}" connected`, details };
}

// --- ShipRocket -------------------------------------------------------------

/**
 * ShipRocket has no credential endpoint other than login, so login IS the test.
 * The token it hands back is short-lived, so its remaining life is reported —
 * "the password works" and "the integration will keep working" are different
 * answers.
 */
export async function shiprocketConnection(str: EnvConfigReader): Promise<EnvConnectionResult> {
  if (!str('email') || !str('password')) {
    return { ok: false, message: 'Account email and password are required', details: [] };
  }
  const res = await fetchJson('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: str('email'), password: str('password') }),
  });
  const token = typeof res.data.token === 'string' ? res.data.token : '';
  if (!res.ok || !token) {
    const reason = res.data.message ? `: ${String(res.data.message)}` : '';
    return {
      ok: false,
      message: `ShipRocket rejected the credentials (HTTP ${res.status})${reason}`,
      details: [],
    };
  }
  const details = [tokenLifetime(token)];
  if (res.data.company_id) details.push(`ShipRocket company id ${String(res.data.company_id)}`);
  const pickup = str('pickup_location');
  details.push(
    pickup
      ? `Default pickup location "${pickup}" — it must match a warehouse in ShipRocket.`
      : 'No default pickup location set — shipments cannot be booked without one.'
  );
  return { ok: true, message: 'ShipRocket accepted the credentials and issued a token', details };
}

// --- Razorpay ---------------------------------------------------------------

/**
 * A read-only, one-row payments listing: the smallest authenticated GET
 * Razorpay offers. Nothing is created and nothing is charged — an order would
 * leave a real record behind for what is only a credential check.
 */
export async function razorpayConnection(str: EnvConfigReader): Promise<EnvConnectionResult> {
  if (!str('key_id') || !str('key_secret')) {
    return { ok: false, message: 'Key ID and key secret are required', details: [] };
  }
  const auth = Buffer.from(`${str('key_id')}:${str('key_secret')}`).toString('base64');
  const res = await fetchJson('https://api.razorpay.com/v1/payments?count=1', {
    method: 'GET',
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    const reason = res.data.error?.description ? `: ${String(res.data.error.description)}` : '';
    return {
      ok: false,
      message: `Razorpay rejected the key id or secret (HTTP ${res.status})${reason}`,
      details: [],
    };
  }
  // The key id is public and carries the environment in its prefix, which is
  // the mistake worth catching: test keys in production take payments nobody
  // is ever charged for.
  const live = str('key_id').startsWith('rzp_live');
  const details = [live ? 'LIVE mode — real money' : 'Test mode — no real money moves'];
  details.push(
    str('webhook_secret')
      ? 'Webhook secret set — inbound Razorpay webhooks are verified.'
      : 'No webhook secret — inbound Razorpay webhooks cannot be verified.'
  );
  return { ok: true, message: 'Razorpay accepted the key id and secret', details };
}

// --- AiSensy ----------------------------------------------------------------

const AISENSY_TEST_USER = 'Duncit Tech';

/** What can be judged without spending a WhatsApp message. */
function aisensyOffline(str: EnvConfigReader): EnvConnectionResult | null {
  if (!str('api_key')) return { ok: false, message: 'Campaign API key is required', details: [] };
  const expiry = jwtExpiryMs(str('api_key'));
  if (expiry && expiry < Date.now()) {
    return {
      ok: false,
      message: `Campaign API key expired on ${new Date(expiry).toDateString()} — issue a new one in AiSensy`,
      details: [],
    };
  }
  return null;
}

/** The Project API is a second, optional credential that only READS. */
function aisensyProjectNote(str: EnvConfigReader): string {
  return str('project_id') && str('project_api_key')
    ? 'Project API configured — campaign and template details can be read back.'
    : 'Project API not configured — campaign and template details cannot be read back.';
}

/**
 * AiSensy's campaign API is the only call its key can make, and that call
 * SENDS. So there are two honest answers, and which one you get depends on
 * whether a destination was supplied:
 *
 *  - no destination — the key is present and unexpired, which is everything
 *    that can be known for free. This is what the generic entries-table probe
 *    gets, so listing entries never spends WhatsApp messages.
 *  - a destination — a real template message goes out, which is the only proof
 *    the key, the campaign name and the template all line up.
 */
export async function aisensyConnection(
  str: EnvConfigReader,
  to?: string
): Promise<EnvConnectionResult> {
  const blocked = aisensyOffline(str);
  if (blocked) return blocked;

  const destination = (to ?? '').replaceAll(/\D/g, '');
  if (!destination) {
    return {
      ok: true,
      message: 'Campaign API key is set and unexpired — send a test message to verify delivery',
      details: [aisensyProjectNote(str)],
    };
  }

  const campaign = str('campaign_name');
  if (!campaign) {
    return {
      ok: false,
      message: 'Default Campaign Name is required before a test message can be sent',
      details: [aisensyProjectNote(str)],
    };
  }

  const details = [`Campaign "${campaign}" -> ${destination}`, aisensyProjectNote(str)];
  const res = await fetchJson(campaignEndpoint(str('base_url')), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      campaignPayload(
        {
          campaign_name: campaign,
          destination,
          user_name: AISENSY_TEST_USER,
          template_params: [],
        },
        str('api_key')
      )
    ),
  });
  if (!res.ok || !campaignSucceeded(res.data)) {
    return {
      ok: false,
      message: `AiSensy rejected the test message: ${campaignErrorReason(res.data, res.status)}`,
      details,
    };
  }
  const messageId = String(res.data.submitted_message_id ?? '');
  if (messageId) details.push(`AiSensy message id ${messageId}`);
  return {
    ok: true,
    message: `AiSensy accepted a WhatsApp test message for ${destination}`,
    details,
  };
}

// --- GitHub -----------------------------------------------------------------

/**
 * Proves the token can SEE the repository, which is the half that can actually
 * be proven. Whether it may start a workflow cannot be — see the note below on
 * why the permissions GitHub reports here are the wrong ones to judge that by.
 */
export async function githubConnection(str: EnvConfigReader): Promise<EnvConnectionResult> {
  const owner = str('owner');
  const repo = str('repo');
  const slug = `${owner}/${repo}`;
  if (!str('token') || !owner || !repo) {
    return { ok: false, message: 'Access token, owner and repository name are all required', details: [] };
  }

  const res = await fetchJson(`https://api.github.com/repos/${slug}`, {
    headers: {
      Authorization: `Bearer ${str('token')}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    // 404 is what GitHub answers for "exists but your token cannot see it", so
    // it must not be reported as a typo in the repository name.
    const reason = res.status === 404 ? 'no such repository, or the token cannot see it' : String(res.data.message ?? '');
    return { ok: false, message: `GitHub rejected the request (HTTP ${res.status}): ${reason}`, details: [] };
  }

  const details: string[] = [];
  const remaining = res.header('x-ratelimit-remaining');
  if (remaining !== null) details.push(`${remaining} API requests left in the current rate-limit window.`);

  // `permissions.push` is CONTENTS write, not Actions write, and the two come
  // apart on exactly the token this category recommends: a fine-grained PAT
  // with Actions: Read and write and Metadata: Read reports push=false and
  // dispatches builds perfectly well. There is no read-only probe for Actions
  // write — the only honest one would be starting a real build — so reaching
  // the repository is the pass mark, and the ambiguity is stated rather than
  // guessed at in either direction.
  if (res.data.permissions?.push === true) {
    details.push('The token can write to this repository, so it can start builds.');
  } else {
    details.push(
      'Could not confirm write access from here — GitHub only reports Contents permission on this call, not Actions. If Create build is refused, give the token Actions: Read and write (classic: the repo and workflow scopes).'
    );
  }
  return { ok: true, message: `Connected to ${String(res.data.full_name ?? slug)}`, details };
}

// --- Dispatch ---------------------------------------------------------------

/**
 * The categories a "Test connection" button is offered for. Anything else is
 * either already covered by an interactive test (send an email, place a call,
 * upload a file) or has no credential a request can prove.
 */
const CONNECTION_CHECKS = {
  SLACK: slackConnection,
  SHIPROCKET: shiprocketConnection,
  RAZORPAY: razorpayConnection,
  AISENSY: aisensyConnection,
  GITHUB: githubConnection,
} as const;

export type ConnectionTestable = keyof typeof CONNECTION_CHECKS;

export const isConnectionTestable = (category: string): category is ConnectionTestable =>
  category in CONNECTION_CHECKS;

/** The one thing that can go wrong the same way for every vendor. */
function transportFailure(category: string, error: any): EnvConnectionResult {
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
    return { ok: false, message: `${category} did not answer within ${TIMEOUT_MS / 1000}s`, details: [] };
  }
  // Not error.message: Node reports every connection-level failure as the same
  // `fetch failed` and hides the real one on `cause`. This row lands in the
  // WhatsApp log beside the automatic sends, which already name it.
  const reason = describeFetchError(error);
  return { ok: false, message: `Connection failed: ${reason}`, details: [] };
}

/**
 * Run one category's credential check. A vendor that rejects, times out or
 * throws is a RESULT (`ok: false`), never an exception — a failed test is the
 * answer the operator asked for.
 */
export async function runEnvConnectionCheck(
  category: ConnectionTestable,
  str: EnvConfigReader,
  options: EnvConnectionOptions = {}
): Promise<EnvConnectionResult> {
  try {
    if (category === 'AISENSY') return await aisensyConnection(str, options.to);
    return await CONNECTION_CHECKS[category](str);
  } catch (error: any) {
    return transportFailure(category, error);
  }
}
