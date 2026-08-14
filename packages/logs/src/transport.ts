import type { LogRecord, Transport } from './types';

export interface HttpTransportOptions {
  /**
   * The surface's session JWT. Sent as `Authorization: Bearer …` so the SERVER
   * decides who the log belongs to. Identity is never taken from the body — a
   * page can put any id it likes there — so a surface that does not pass this
   * simply produces logs attributed to nobody, which is the honest answer.
   */
  getToken?: () => string | null | undefined;
  /** Duncit device id, forwarded as `x-duid` exactly like an API call. */
  getDeviceId?: () => string | null | undefined;
}

/** Header bag for one POST: content type, plus whatever identity is available. */
function buildHeaders(opts?: HttpTransportOptions): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = opts?.getToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  const duid = opts?.getDeviceId?.();
  if (duid) headers['x-duid'] = duid;
  return headers;
}

/**
 * Fire-and-forget POST of the record to the backend `/logs` ingest endpoint.
 * Safe in browser, React Native and Node 18+ (global `fetch`). Never throws and
 * never blocks the caller.
 */
export function httpTransport(endpoint: string, opts?: HttpTransportOptions): Transport {
  return (record: LogRecord) => {
    try {
      fetch(endpoint, {
        method: 'POST',
        headers: buildHeaders(opts),
        body: JSON.stringify(record),
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      /* logging must never throw */
    }
  };
}

/** Default transport until configured — mirror to console so logs aren't lost. */
export const consoleTransport: Transport = (record: LogRecord) => {
  const source = record.portal ? `${record.app}:${record.portal}` : record.app;
  const tag = `${source}@${record.environment}`;
  const line = `[${tag}] ${record.page}/${record.component}`;
  /* eslint-disable no-console -- structured log transport writes to the console */
  const byLevel = {
    error: console.error,
    warn: console.warn,
    debug: console.debug,
    info: console.info,
  };
  /* eslint-enable no-console */
  const sink = byLevel[record.level] ?? byLevel.info;
  sink(line, record.error ?? record.data ?? '');
};
