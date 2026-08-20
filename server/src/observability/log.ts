/**
 * Server-side structured logger + ingest for frontend logs, both shipped to
 * SignOz via the OTLP LoggerProvider set up in ../otel.ts.
 *
 * Mirrors the @duncit/logs API shape so the call sites read identically across
 * the stack:  logs.server.error(page, component, { error, ...context }).
 *
 * Every record carries the filterable attribute set SignOz needs — app / portal,
 * platform (server|web|native), environment (localhost|staging|production),
 * url + host, and the flattened error — so a single dashboard can slice by
 * environment, which app/portal, and which URL.
 *
 * Emits through the global OTel logs API: if telemetry is disabled (no
 * OTEL_EXPORTER_OTLP_ENDPOINT) getLogger() returns a no-op logger, so these
 * calls are safe and cheap in local dev.
 */
import os from 'node:os';
import { logs as logsApi, SeverityNumber, type Logger } from '@opentelemetry/api-logs';
import { telemetryRuntime } from './telemetryRuntime';
import { requestIdentity, type RequestIdentity } from './requestIdentity';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type Environment = 'localhost' | 'staging' | 'production';
type Platform = 'web' | 'native' | 'server';
type DeviceOS = 'ios' | 'android' | 'web';

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

/** Who the record belongs to. Always server-resolved — never read from a body. */
export interface LogUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  roles?: string[];
}

/** What the emitting surface knows about the machine it is running on. */
export interface LogClient {
  app_version?: string;
  device_model?: string;
  device_os_version?: string;
  locale?: string;
  timezone?: string;
  screen?: string;
  viewport?: string;
  network?: string;
  referrer?: string;
}

export interface LogRecord {
  app: string;
  portal?: string;
  platform: Platform;
  os?: DeviceOS;
  environment: Environment;
  url?: string;
  host?: string;
  level: LogLevel;
  page: string;
  component: string;
  error?: SerializedError;
  data?: Record<string, unknown>;
  user?: LogUser;
  client?: LogClient;
  /** Duncit device id (`x-duid`) and the surface's per-tab / per-launch id. */
  duid?: string;
  session_id?: string;
  /** Read off the request by the server, so neither can be spoofed by a body. */
  ip?: string;
  user_agent?: string;
}

/** Per-call detail bag: pass the thrown value as `error`/`err`; the rest is data. */
type LogDetail = Record<string, unknown> & { error?: unknown; err?: unknown };

const SEVERITY: Record<LogLevel, { num: SeverityNumber; text: string }> = {
  debug: { num: SeverityNumber.DEBUG, text: 'DEBUG' },
  info: { num: SeverityNumber.INFO, text: 'INFO' },
  warn: { num: SeverityNumber.WARN, text: 'WARN' },
  error: { num: SeverityNumber.ERROR, text: 'ERROR' },
};
const LEVELS = new Set<LogLevel>(['debug', 'info', 'warn', 'error']);
const PLATFORMS = new Set<Platform>(['web', 'native', 'server']);
const DEVICE_OSES = new Set<DeviceOS>(['ios', 'android', 'web']);
const ENVIRONMENTS = new Set<Environment>(['localhost', 'staging', 'production']);

/** The server's own deployment environment, from APP_ENV / NODE_ENV. */
const SERVER_ENV: Environment = (() => {
  const e = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase();
  if (e.includes('staging')) return 'staging';
  if (e === 'development' || e === 'test' || e === 'local' || e === '') return 'localhost';
  return 'production';
})();
const SERVER_HOST = process.env.PUBLIC_SERVER_HOST || os.hostname() || undefined;

const logger: Logger = logsApi.getLogger('duncit-app-logs');

type AttrValue = string | number | boolean;

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
  return value !== null && typeof value !== 'object' && value !== undefined;
}

/**
 * Stand-in for an object JSON.stringify refuses (circular refs, BigInt).
 *
 * Deliberately a FIXED string. Interpolating the object yields the useless
 * "[object Object]" (S6551), but listing its keys instead would put caller field
 * names — `password`, `refresh_token` — on the wire to SignOz and Mongo, and
 * would make `Bug.fingerprint` key-dependent, forking one bug into a new row per
 * distinct object shape. Keep this identical to the client's copy in
 * packages/logs/src/logs.ts: they are two halves of one wire contract.
 */
const UNSERIALIZABLE_MESSAGE = '[unserializable object]';

/** Flatten any thrown value to { name, message, stack }. */
export function serializeError(err: unknown): SerializedError | undefined {
  if (err === null || err === undefined) return undefined;
  if (err instanceof Error) return { name: err.name || 'Error', message: err.message, stack: err.stack };
  if (isStringifiable(err)) return { name: typeof err, message: String(err) };
  try {
    return { name: 'Object', message: JSON.stringify(err) };
  } catch {
    return { name: 'Object', message: UNSERIALIZABLE_MESSAGE };
  }
}

/**
 * Copy the set fields of a sub-object onto the attribute bag.
 *
 * `prefix` namespaces a nested object (`user.email`); passing '' keeps the
 * top-level names SignOz dashboards already filter on (`portal`, `url`, `host`)
 * — renaming those would silently empty every saved query built on them.
 */
function addFields(
  attrs: Record<string, AttrValue>,
  prefix: string,
  source: object | undefined,
): void {
  if (!source) return;
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null || value === '') continue;
    attrs[prefix ? `${prefix}.${key}` : key] = Array.isArray(value)
      ? value.join(',')
      : (value as AttrValue);
  }
}

/** The flattened error triple, as its own three attributes. */
function addError(attrs: Record<string, AttrValue>, error: SerializedError | undefined): void {
  if (!error) return;
  attrs['error.name'] = error.name;
  attrs['error.message'] = error.message;
  if (error.stack) attrs['error.stack'] = error.stack;
}

/** The caller's own context bag, one `data.<key>` attribute per entry. */
function addData(attrs: Record<string, AttrValue>, data: Record<string, unknown> | undefined): void {
  if (!data || typeof data !== 'object') return;
  for (const [key, value] of Object.entries(data)) {
    attrs[`data.${key}`] =
      value === null || typeof value === 'object' ? JSON.stringify(value) : (value as AttrValue);
  }
}

function toAttributes(record: LogRecord): Record<string, AttrValue> {
  const attrs: Record<string, AttrValue> = {
    app: record.app,
    platform: record.platform,
    environment: record.environment,
    page: record.page,
    component: record.component,
  };
  addFields(attrs, 'user', record.user);
  addFields(attrs, 'client', record.client);
  addFields(attrs, '', {
    portal: record.portal,
    os: record.os,
    url: record.url,
    host: record.host,
    duid: record.duid,
    session_id: record.session_id,
    ip: record.ip,
    user_agent: record.user_agent,
  });
  addError(attrs, record.error);
  addData(attrs, record.data);
  return attrs;
}

function emitStructured(record: LogRecord): void {
  // Ship to SigNoz (OTLP) unless the admin toggled it off in Telemetry Settings.
  if (telemetryRuntime.signozEnabled) {
    try {
      const sev = SEVERITY[record.level] ?? SEVERITY.info;
      const source = record.portal ? `${record.app}:${record.portal}` : record.app;
      logger.emit({
        severityNumber: sev.num,
        severityText: sev.text,
        body: `[${source}@${record.environment}] ${record.page}/${record.component}`,
        attributes: toAttributes(record),
      });
    } catch {
      /* logging must never throw */
    }
  }
  // Persist to Mongo for the in-app Telemetry Dashboard / Bugs views — only for
  // the admin-selected levels, and only once the telemetry ingest is wired up.
  if (telemetryRuntime.shouldPersist(record.level)) telemetryRuntime.persist(record);
}

function levelFns(base: { app: string; portal?: string }) {
  const make =
    (level: LogLevel) =>
    (page: string, component: string, detail?: LogDetail) => {
      let error: SerializedError | undefined;
      let data: Record<string, unknown> | undefined;
      if (detail) {
        const { error: e, err, ...rest } = detail;
        error = serializeError(e ?? err);
        data = Object.keys(rest).length > 0 ? rest : undefined;
      }
      // Whoever's request we are inside, when we are inside one. A scheduler or
      // a boot-time log has no caller, and correctly reports none.
      const caller: RequestIdentity = requestIdentity.current() ?? {};
      emitStructured({
        ...base,
        platform: 'server',
        environment: SERVER_ENV,
        host: SERVER_HOST,
        level,
        page,
        component,
        error,
        data,
        user: caller.user,
        duid: caller.duid,
        ip: caller.ip,
        user_agent: caller.user_agent,
      });
    };
  return {
    debug: make('debug'),
    info: make('info'),
    warn: make('warn'),
    error: make('error'),
  };
}

/** Server-side structured logger: logs.server.error(page, component, { error, ... }). */
export const logs = { server: levelFns({ app: 'server' }) };

/** Clamp a raw wire value to one of an enum's members; undefined when it isn't one. */
function clampEnum<T extends string>(value: unknown, allowed: ReadonlySet<T>): T | undefined {
  return typeof value === 'string' && allowed.has(value as T) ? (value as T) : undefined;
}

/** A wire field is only trusted when it arrived as a string. */
function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Rebuild the { name, message, stack } triple the frontend already flattened. */
function parseRemoteError(value: SerializedError | undefined): SerializedError | undefined {
  if (!value || typeof value !== 'object' || typeof value.message !== 'string') return undefined;
  return {
    name: String(value.name || 'Error'),
    message: String(value.message),
    stack: typeof value.stack === 'string' ? value.stack : undefined,
  };
}

/** Fields a browser reports about its own machine — strings, length-capped. */
const CLIENT_KEYS: ReadonlyArray<keyof LogClient> = [
  'app_version',
  'device_model',
  'device_os_version',
  'locale',
  'timezone',
  'screen',
  'viewport',
  'network',
  'referrer',
];

/**
 * The machine description the surface sent. Unlike identity this is not
 * verifiable and does not need to be — it describes the sender's own device,
 * so the worst a lie costs is a wrong line in a bug report. Every value is
 * still clamped to a bounded string so the log collection cannot be inflated.
 */
function parseRemoteClient(value: unknown): LogClient | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const out: LogClient = {};
  for (const key of CLIENT_KEYS) {
    const field = raw[key];
    if (typeof field === 'string' && field !== '') out[key] = field.slice(0, 300);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Ingest a structured log forwarded by a frontend (POST /logs). Fully defensive:
 * validates the shape, clamps enums, forwards the app/portal/platform/environment/
 * url/host/error/data the browser or native app already resolved. Never throws.
 *
 * `caller` is what the SERVER worked out about the request — the account from
 * the verified JWT, the address from the proxy chain. The body's own `user` is
 * ignored outright: this endpoint is public by design, so anything in it is a
 * claim, and a bug filed against an account that did not hit it is worse than
 * one filed against nobody.
 */
export function ingestRemoteLog(raw: unknown, caller: RequestIdentity = {}): void {
  if (!raw || typeof raw !== 'object') return;
  const r = raw as Partial<LogRecord>;
  if (typeof r.app !== 'string' || typeof r.page !== 'string' || typeof r.component !== 'string') return;
  emitStructured({
    app: r.app,
    portal: optionalString(r.portal),
    platform: clampEnum(r.platform, PLATFORMS) ?? 'web',
    os: clampEnum(r.os, DEVICE_OSES),
    environment: clampEnum(r.environment, ENVIRONMENTS) ?? 'production',
    url: optionalString(r.url),
    host: optionalString(r.host),
    level: clampEnum(r.level, LEVELS) ?? 'info',
    page: r.page,
    component: r.component,
    error: parseRemoteError(r.error),
    data: r.data && typeof r.data === 'object' ? r.data : undefined,
    user: caller.user,
    client: parseRemoteClient(r.client),
    // The header wins: it is the same value the surface authenticates with.
    duid: caller.duid ?? optionalString(r.duid)?.slice(0, 100),
    session_id: optionalString(r.session_id)?.slice(0, 100),
    ip: caller.ip,
    user_agent: caller.user_agent,
  });
}
