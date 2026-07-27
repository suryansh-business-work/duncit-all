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

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type Environment = 'localhost' | 'staging' | 'production';
type Platform = 'web' | 'native' | 'server';
type DeviceOS = 'ios' | 'android' | 'web';

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

interface LogRecord {
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
  if (typeof err === 'object') {
    try {
      return { name: 'Object', message: JSON.stringify(err) };
    } catch {
      return { name: 'Object', message: UNSERIALIZABLE_MESSAGE };
    }
  }
  // Everything left is a primitive or a function, each with a meaningful
  // toString(). Sonar does not follow the narrowing the guards above perform:
  // `String(err)` trips S6551 ("may stringify an object") and asserting the type
  // to silence it trips S4325 ("assertion changes nothing"). Naming each type
  // explicitly satisfies both, and every branch produces exactly what
  // `String(err)` did.
  if (typeof err === 'string') return { name: 'string', message: err };
  if (typeof err === 'symbol' || typeof err === 'function') {
    return { name: typeof err, message: err.toString() };
  }
  return { name: typeof err, message: `${err}` };
}

function toAttributes(record: LogRecord): Record<string, AttrValue> {
  const attrs: Record<string, AttrValue> = {
    app: record.app,
    platform: record.platform,
    environment: record.environment,
    page: record.page,
    component: record.component,
  };
  if (record.portal) attrs.portal = record.portal;
  if (record.os) attrs.os = record.os;
  if (record.url) attrs.url = record.url;
  if (record.host) attrs.host = record.host;
  if (record.error) {
    attrs['error.name'] = record.error.name;
    attrs['error.message'] = record.error.message;
    if (record.error.stack) attrs['error.stack'] = record.error.stack;
  }
  if (record.data && typeof record.data === 'object') {
    for (const [key, value] of Object.entries(record.data)) {
      attrs[`data.${key}`] =
        value === null || typeof value === 'object'
          ? JSON.stringify(value)
          : (value as AttrValue);
    }
  }
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

/**
 * Ingest a structured log forwarded by a frontend (POST /logs). Fully defensive:
 * validates the shape, clamps enums, forwards the app/portal/platform/environment/
 * url/host/error/data the browser or native app already resolved. Never throws.
 */
export function ingestRemoteLog(raw: unknown): void {
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
  });
}
