/** Just the part of the request this file reads — so it stays testable without one. */
export interface RequestHeaders {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Where a surface lives, per environment.
 *
 * A link the bot hands back has to open the console the person is *actually*
 * using: someone running the stack locally must get `http://localhost:2002`, not
 * a production URL that would sign them into a different database. Nothing in
 * the answer can decide that — only the request can, so the environment is read
 * off the caller's own origin and every link in that reply is built from it.
 */
export interface SurfaceHost {
  /** Production hostname, e.g. `admin.duncit.com`. */
  host: string;
  /** Vite dev-server port. 0 for a surface with no local web server (the app). */
  dev_port: number;
}

export type Environment = 'LOCAL' | 'STAGING' | 'PRODUCTION';

const LOCAL_HOSTNAMES: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * The environment the caller is in, from the browser's own origin.
 *
 * `origin` is sent on every cross-origin POST, which every portal's GraphQL call
 * is; `referer` covers the same-origin case, and an unreadable header falls back
 * to production — the safe default, because a production link opened locally is
 * merely inconvenient while the reverse signs someone into the wrong data.
 */
export function callerEnvironment(req: RequestHeaders | null | undefined): Environment {
  const raw = headerValue(req, 'origin') ?? headerValue(req, 'referer');
  if (!raw) return 'PRODUCTION';
  let hostname: string;
  try {
    hostname = new URL(raw).hostname;
  } catch {
    return 'PRODUCTION';
  }
  if (LOCAL_HOSTNAMES.has(hostname)) return 'LOCAL';
  if (hostname.startsWith('staging.')) return 'STAGING';
  return 'PRODUCTION';
}

function headerValue(req: RequestHeaders | null | undefined, name: string): string | null {
  const raw = req?.headers?.[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * The origin a surface answers on in this environment, without a trailing slash.
 *
 * Empty when the surface has no address there — the native app has no local web
 * server, and a link to `http://localhost:0` is worse than no link at all.
 */
export function surfaceOrigin(surface: SurfaceHost, environment: Environment): string {
  if (environment === 'LOCAL') {
    return surface.dev_port > 0 ? `http://localhost:${surface.dev_port}` : '';
  }
  const prefix = environment === 'STAGING' ? 'staging.' : '';
  return `https://${prefix}${surface.host}`;
}

/** A surface origin joined to a route path, with exactly one slash between them. */
export function surfaceUrl(surface: SurfaceHost, environment: Environment, path: string): string {
  const origin = surfaceOrigin(surface, environment);
  if (!origin) return '';
  const route = path.startsWith('/') ? path : `/${path}`;
  return route === '/' ? origin : `${origin}${route.replace(/\/+$/, '')}`;
}
