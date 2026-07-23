import { PORTALS, WEBSITES, detectEnvironment, type PortalKey, type WebsiteKey } from './config';
import { consoleTransport } from './transport';
import type {
  DeviceOS,
  Environment,
  LevelFns,
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
}

// One process-wide transport + context. Apps call configureLogs() once at
// startup (httpTransport in browsers/native, an OTLP transport in the server).
let activeTransport: Transport = consoleTransport;
let context: LogContext = { platform: 'web' };

export function configureLogs(transport: Transport, ctx?: Partial<LogContext>): void {
  activeTransport = transport;
  if (ctx) context = { ...context, ...ctx };
}

/** Flatten any thrown value to { name, message, stack } so SignOz shows it all. */
export function serializeError(err: unknown): SerializedError | undefined {
  if (err === null || err === undefined) return undefined;
  if (err instanceof Error) {
    return { name: err.name || 'Error', message: err.message, stack: err.stack };
  }
  if (typeof err === 'object') {
    try {
      return { name: 'Object', message: JSON.stringify(err) };
    } catch {
      return { name: 'Object', message: String(err) };
    }
  }
  return { name: typeof err, message: String(err) };
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

function emit(
  base: Pick<LogRecord, 'app' | 'portal'>,
  level: LogLevel,
  page: string,
  component: string,
  detail?: LogDetail,
): void {
  try {
    const host = currentHost();
    let error: SerializedError | undefined;
    let data: Record<string, unknown> | undefined;
    if (detail) {
      const { error: e, err, ...rest } = detail;
      error = serializeError(e ?? err);
      data = Object.keys(rest).length > 0 ? rest : undefined;
    }
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
