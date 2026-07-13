/**
 * Server-side structured logger + ingest for frontend logs, both shipped to
 * SignOz via the OTLP LoggerProvider set up in ../otel.ts.
 *
 * Mirrors the @duncit/logs API shape so the call sites read identically across
 * the stack:  logs.server.error(page, component, { ...context }).
 *
 * Emits through the global OTel logs API: if telemetry is disabled (no
 * OTEL_EXPORTER_OTLP_ENDPOINT) getLogger() returns a no-op logger, so these
 * calls are safe and cheap in local dev.
 */
import { logs as logsApi, SeverityNumber, type Logger } from '@opentelemetry/api-logs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogRecord {
  app: string;
  portal?: string;
  level: LogLevel;
  page: string;
  component: string;
  data?: Record<string, unknown>;
}

const SEVERITY: Record<LogLevel, { num: SeverityNumber; text: string }> = {
  debug: { num: SeverityNumber.DEBUG, text: 'DEBUG' },
  info: { num: SeverityNumber.INFO, text: 'INFO' },
  warn: { num: SeverityNumber.WARN, text: 'WARN' },
  error: { num: SeverityNumber.ERROR, text: 'ERROR' },
};
const LEVELS = new Set<LogLevel>(['debug', 'info', 'warn', 'error']);

const logger: Logger = logsApi.getLogger('duncit-app-logs');

type AttrValue = string | number | boolean;

function toAttributes(record: LogRecord): Record<string, AttrValue> {
  const attrs: Record<string, AttrValue> = {
    app: record.app,
    page: record.page,
    component: record.component,
  };
  if (record.portal) attrs.portal = record.portal;
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
  try {
    const sev = SEVERITY[record.level] ?? SEVERITY.info;
    const tag = record.portal ? `${record.app}:${record.portal}` : record.app;
    logger.emit({
      severityNumber: sev.num,
      severityText: sev.text,
      body: `[${tag}] ${record.page}/${record.component}`,
      attributes: toAttributes(record),
    });
  } catch {
    /* logging must never throw */
  }
}

function levelFns(base: { app: string; portal?: string }) {
  const make =
    (level: LogLevel) =>
    (page: string, component: string, data?: Record<string, unknown>) =>
      emitStructured({ ...base, level, page, component, data });
  return {
    debug: make('debug'),
    info: make('info'),
    warn: make('warn'),
    error: make('error'),
  };
}

/** Server-side structured logger: logs.server.error(page, component, { ... }). */
export const logs = { server: levelFns({ app: 'server' }) };

/**
 * Ingest a structured log forwarded by a frontend (POST /logs). Fully defensive:
 * validates the shape, clamps the level, never throws.
 */
export function ingestRemoteLog(raw: unknown): void {
  if (!raw || typeof raw !== 'object') return;
  const r = raw as Partial<LogRecord>;
  if (typeof r.app !== 'string' || typeof r.page !== 'string' || typeof r.component !== 'string') return;
  const level: LogLevel = typeof r.level === 'string' && LEVELS.has(r.level) ? r.level : 'info';
  emitStructured({
    app: r.app,
    portal: typeof r.portal === 'string' ? r.portal : undefined,
    level,
    page: r.page,
    component: r.component,
    data: r.data && typeof r.data === 'object' ? r.data : undefined,
  });
}
