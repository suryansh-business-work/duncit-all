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

/** The surfaces that can edit a user profile. */
export type ClientSurface = 'NATIVE' | 'MWEB' | 'ADMIN_PORTAL' | 'PORTAL';
