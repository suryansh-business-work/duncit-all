/**
 * WHERE a ShipRocket call is sent: the live API, or ShipRocket's sandbox.
 *
 * ShipRocket runs a sandbox beside production (its panel: Settings → Additional
 * Settings → Sandbox). Every production endpoint has a sandbox counterpart on
 * the sandbox host, reached with the sandbox API user's own email and password:
 *
 *   production  https://apiv2.shiprocket.in
 *   sandbox     https://api-sandbox.shiprocket.in
 *
 * An account in sandbox mode books test orders only, so its calls go to the
 * sandbox host and nowhere else; an account that is not in sandbox mode goes to
 * production exactly as it always has — nothing here touches that path.
 *
 * The sandbox address is built in. The Tech portal's SHIPROCKET entry may
 * override it ("Sandbox API URL") should ShipRocket ever move the sandbox; an
 * override must be an https ShipRocket host, because the request carries the
 * API user's password and a mistyped address must not receive it. A bad
 * override is REFUSED — it never falls back to production.
 *
 * (ShipRocket also lists `serviceability-sandbox.shiprocket.in`, which serves
 * only its blocked-pincode upload endpoints — nothing this server calls.)
 *
 * Pure on purpose (no database), so the Tech portal's connection check and the
 * shipping client both resolve an address through the same function.
 */
const API_PATH = '/v1/external';

export const SR_LIVE_BASE = `https://apiv2.shiprocket.in${API_PATH}`;
export const SR_SANDBOX_BASE = `https://api-sandbox.shiprocket.in${API_PATH}`;

/** The hosts a ShipRocket API user's credentials may be sent to. */
const SHIPROCKET_HOSTS = ['shiprocket.in', 'shiprocket.co', 'shiprocket.com'];

export const SANDBOX_URL_INVALID =
  'The saved Sandbox API URL is not a ShipRocket address. It must start with https:// and end in shiprocket.in (ShipRocket → Settings → Additional Settings → Sandbox shows it), or be left blank to use the standard sandbox. Nothing was sent.';

/**
 * What the sandbox's own gateway answers when it will not take a request at
 * all — before any login, whatever the credentials (seen 2026-10: every path on
 * the sandbox host, with or without a body, from a network it has not allowed).
 */
export const SANDBOX_GATEWAY_DENIED_STATUS = 498;

export const SANDBOX_GATEWAY_DENIED =
  'ShipRocket’s sandbox turned the request away before it reached the login (HTTP 498, Access Denied). That is the sandbox gateway, not the email or password: it answers only the networks ShipRocket has allowed. Ask ShipRocket support to enable sandbox API access for this server, then test again. Nothing was sent to production.';

const isShiprocketHost = (host: string) => SHIPROCKET_HOSTS.some((known) => host === known || host.endsWith(`.${known}`));

/**
 * A saved sandbox override, ready to prefix a path: no trailing slash, no
 * query. Blank in ⇒ blank out (no override). Anything that is not an https
 * ShipRocket address ⇒ null (set, but unusable). A bare host, which is how
 * ShipRocket's panel prints it, gets the API path every endpoint lives under.
 */
export function cleanSandboxUrl(raw: unknown): string | null {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return '';
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !isShiprocketHost(url.hostname.toLowerCase())) return null;
  let path = url.pathname;
  while (path.endsWith('/')) path = path.slice(0, -1);
  return `${url.origin}${path || API_PATH}`;
}

export type ShiprocketBase = { ok: true; url: string } | { ok: false; message: string };

/**
 * The API address for an account: production, or the sandbox when the account
 * is in sandbox mode (the standard sandbox unless the Tech portal overrides it).
 */
export function resolveShiprocketBase(sandbox: boolean, sandboxUrl: unknown): ShiprocketBase {
  if (!sandbox) return { ok: true, url: SR_LIVE_BASE };
  const override = cleanSandboxUrl(sandboxUrl);
  if (override === null) return { ok: false, message: SANDBOX_URL_INVALID };
  return { ok: true, url: override || SR_SANDBOX_BASE };
}

/** A stored on/off value however it was saved (boolean on a brand, 'true' text from the Tech portal's form). */
export const isSandboxOn = (value: unknown): boolean => value === true || value === 'true' || value === '1';
