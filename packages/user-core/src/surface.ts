/**
 * Which Duncit surface a request came from.
 *
 * The server cannot tell mWeb from the native app by the `Origin` header
 * alone — a store build sends no Origin at all — and the admin user change
 * log has to name the surface behind every profile edit. So each transport
 * declares itself once, in one header, and the server reads it into the
 * request identity every resolver already runs inside.
 *
 * Lives here because all four transports (native, mWeb, the portal shell and
 * admin) already build their request headers from this package — see
 * `getOrCreateDuid` and `NO_REDIS_HEADER`.
 *
 * NOTE: adding a value here is not enough on its own. The header is on the
 * nginx `Access-Control-Allow-Headers` allowlist (deploy/nginx/*), which is
 * what makes the browser preflight pass in staging and production.
 */

/** The header every Duncit client sends to name itself. */
export const SURFACE_HEADER = 'x-duncit-surface';

/**
 * WHICH app inside that surface — `tech`, `finance`, `mweb`, `native`.
 *
 * `PORTAL` covers seventeen consoles, which is enough for a change log entry
 * and not nearly enough for rate limiting: the CRM's bulk WhatsApp screens and
 * the Legal portal's four page views a day are the same surface and should not
 * share a ceiling. Every client already builds its headers from this package,
 * so it declares its key here rather than the server guessing from an Origin
 * a store build never sends.
 *
 * Same nginx caveat as the surface header above: the value is on the
 * `Access-Control-Allow-Headers` allowlist in deploy/nginx/*, and a browser
 * preflight fails without it.
 */
export const APP_HEADER = 'x-duncit-app';

/** The surfaces that can edit a user profile. */
export type ClientSurface = 'NATIVE' | 'MWEB' | 'ADMIN_PORTAL' | 'PORTAL';

/**
 * Every value the surface header may carry.
 *
 * Wider than `ClientSurface` because the Astro sites call the API too, and a
 * website has no profile to edit — it still has to name itself, or the server
 * files its traffic as unidentified.
 */
export type ClientSurfaceName = ClientSurface | 'WEBSITE';

/**
 * The pair of headers a client sends to say who it is.
 *
 * One helper rather than two lines written out per caller: five Astro sites
 * each build their own `fetch` for the API, and five hand-written copies of the
 * same two headers is five chances for one of them to name itself wrong and
 * quietly disappear from the rate limiter's Systems page (rule 40).
 *
 * An empty `app` sends only the surface, which is exactly what a caller that
 * cannot name itself should look like — never a fabricated key.
 */
export function clientIdentityHeaders(
  surface: ClientSurfaceName,
  app: string,
): Record<string, string> {
  const key = app.trim();
  return { [SURFACE_HEADER]: surface, ...(key ? { [APP_HEADER]: key } : {}) };
}
