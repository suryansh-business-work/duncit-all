import { PORTALS, WEBSITES, detectEnvironment, type PortalKey, type WebsiteKey } from './config';
import { browserClientInfo, compactClient, sessionId } from './client-info';
import { consoleTransport } from './transport';
import type {
  DeviceOS,
  Environment,
  LevelFns,
  LogClient,
  LogDetail,
  LogLevel,
  LogRecord,
  Platform,
  SerializedError,
  Transport,
} from './types';

/**
 * Runtime context every record is stamped with. Resolved lazily on each emit so
 * `url`/`environment` always reflect the current page (SPA navigation, etc.).
 * Apps set this once via configureLogs(transport, context).
 */
export interface LogContext {
  platform: Platform;
  /** Native device OS (ios | android | web). Set by the mobile app; unset on web. */
  os?: DeviceOS;
  /** Portal/website key, stamped on every record whose bound logger didn't set one
   * (so shared/generic loggers in a portal still carry the portal identity). */
  portal?: string;
  /** Fixed value or a resolver. Defaults to detecting from the current host. */
  environment?: Environment | (() => Environment);
  /** Full URL of the event. Defaults to location.href in browsers. */
  url?: () => string | undefined;
  /** Hostname. Defaults to location.hostname in browsers. */
  host?: () => string | undefined;
  /**
   * Build/device facts this surface knows that a browser cannot report on its
   * own — app version, native device model. Layered OVER the auto-detected
   * browser fields, so a surface only names what it adds.
   */
  client?: () => LogClient | undefined;
  /** Duncit device id, the same value the surface sends the API as `x-duid`. */
  duid?: () => string | undefined;
}

// One process-wide transport + context. Apps call configureLogs() once at
// startup (httpTransport in browsers/native, an OTLP transport in the server).
let activeTransport: Transport = consoleTransport;
let context: LogContext = { platform: 'web' };

export function configureLogs(transport: Transport, ctx?: Partial<LogContext>): void {
  activeTransport = transport;
  if (ctx) context = { ...context, ...ctx };
}

/**
 * Every thrown value that is not null, not undefined and not an object. Each of
 * these has a meaningful toString(), so String() over this union can never
 * produce '[object Object]'.
 */
type Stringifiable = string | number | boolean | bigint | symbol | ((...args: unknown[]) => unknown);

/**
 * A real type predicate, not an assertion.
 *
 * This is what lets String() below receive a concrete non-object union, so
 * S6551 is satisfied by the TYPE rather than by an `as` cast — which S4325 would
 * reject in turn. Narrowing through plain early-returns does not satisfy the
 * rule; a predicate does. Keep this identical in both halves of the wire
 * contract.
 */
function isStringifiable(value: unknown): value is Stringifiable {
  return value !== null && typeof value !== 'object' && typeof value !== 'undefined';
}

/**
 * Stand-in for an object JSON.stringify refuses (circular refs, BigInt).
 *
 * Deliberately a FIXED string. Interpolating the object yields the useless
 * "[object Object]" (S6551), but listing its keys instead would put caller field
 * names — `password`, `refresh_token` — on the wire to SignOz and Mongo, and
 * would make the telemetry fingerprint key-dependent, forking one bug into a
 * new row per distinct object shape. Keep this identical to the server's copy
 * in server/src/observability/log.ts: they are two halves of one wire contract.
 */
const UNSERIALIZABLE_MESSAGE = '[unserializable object]';

/** Flatten any thrown value to { name, message, stack } so SignOz shows it all. */
export function serializeError(err: unknown): SerializedError | undefined {
  if (err === null || err === undefined) return undefined;
  if (err instanceof Error) {
    return { name: err.name || 'Error', message: err.message, stack: err.stack };
  }
  if (isStringifiable(err)) return { name: typeof err, message: String(err) };
  try {
    return { name: 'Object', message: JSON.stringify(err) };
  } catch {
    return { name: 'Object', message: UNSERIALIZABLE_MESSAGE };
  }
}

function currentHost(): string | undefined {
  if (context.host) return context.host();
  if (typeof location !== 'undefined') return location.hostname || undefined;
  return undefined;
}

function currentUrl(): string | undefined {
  if (context.url) return context.url();
  if (typeof location !== 'undefined') return location.href || undefined;
  return undefined;
}

function currentEnvironment(host: string | undefined): Environment {
  const env = context.environment;
  if (typeof env === 'function') return env();
  if (env) return env;
  return detectEnvironment(host);
}

/**
 * What the machine looks like right now: the browser's own reading, with the
 * app's contribution (version, native device) layered on top. Each half is
 * compacted first so an absent field on either side never erases the other's.
 */
function currentClient(): LogClient | undefined {
  const merged = { ...browserClientInfo(), ...compactClient(context.client?.() ?? {}) };
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/** The thrown value and the rest of the detail bag, split apart. */
function splitDetail(detail?: LogDetail): {
  error?: SerializedError;
  data?: Record<string, unknown>;
} {
  if (!detail) return {};
  const { error: e, err, ...rest } = detail;
  return {
    error: serializeError(e ?? err),
    data: Object.keys(rest).length > 0 ? rest : undefined,
  };
}

function emit(
  base: Pick<LogRecord, 'app' | 'portal'>,
  level: LogLevel,
  page: string,
  component: string,
  detail?: LogDetail,
): void {
  try {
    const host = currentHost();
    const { error, data } = splitDetail(detail);
    activeTransport({
      ...base,
      portal: base.portal ?? context.portal,
      platform: context.platform,
      os: context.os,
      environment: currentEnvironment(host),
      url: currentUrl(),
      host,
      level,
      page,
      component,
      error,
      data,
      client: currentClient(),
      duid: context.duid?.(),
      session_id: sessionId(),
      timestamp: new Date().toISOString(),
    });
  } catch {
    /* logging must never throw */
  }
}

function levelFns(base: Pick<LogRecord, 'app' | 'portal'>): LevelFns {
  return {
    debug: (page, component, detail) => emit(base, 'debug', page, component, detail),
    info: (page, component, detail) => emit(base, 'info', page, component, detail),
    warn: (page, component, detail) => emit(base, 'warn', page, component, detail),
    error: (page, component, detail) => emit(base, 'error', page, component, detail),
  };
}

/** Build a file-level logger for any app/portal/website. Each app exports its own
 * bound `log` (e.g. `export const log = createLogger('portal', 'crm')`) so call
 * sites read `log.error(page, component, { error })`. */
export function createLogger(app: string, portal?: string): LevelFns {
  return levelFns(portal ? { app, portal } : { app });
}

// logs.portal.<name> / logs.website.<name> — built from the global lists.
const portal = PORTALS.reduce(
  (acc, key) => {
    acc[key] = levelFns({ app: 'portal', portal: key });
    return acc;
  },
  {} as Record<PortalKey, LevelFns>,
);

const website = WEBSITES.reduce(
  (acc, key) => {
    acc[key] = levelFns({ app: 'website', portal: key });
    return acc;
  },
  {} as Record<WebsiteKey, LevelFns>,
);

/**
 * Global structured logger. Prefer a per-file `createLogger(...)` bound `log`,
 * but these shared entrypoints work everywhere too.
 *   logs.mWeb.error(page, component, { error })
 *   logs.portal.crm.warn(page, component, { error, id })
 *   logs.website.duncit.info(page, component, { ... })
 */
export const logs = {
  server: levelFns({ app: 'server' }),
  mWeb: levelFns({ app: 'mWeb' }),
  mobileApp: levelFns({ app: 'mobileApp' }),
  portal,
  website,
};
