import type { LogRecord, Transport } from './types';

/**
 * Fire-and-forget POST of the record to the backend `/logs` ingest endpoint.
 * Safe in browser, React Native and Node 18+ (global `fetch`). Never throws and
 * never blocks the caller.
 */
export function httpTransport(endpoint: string): Transport {
  return (record: LogRecord) => {
    try {
      void fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  const tag = record.portal ? `${record.app}:${record.portal}` : record.app;
  const line = `[${tag}] ${record.page}/${record.component}`;
  // eslint-disable-next-line no-console
  const sink =
    record.level === 'error'
      ? console.error
      : record.level === 'warn'
        ? console.warn
        : record.level === 'debug'
          ? console.debug
          : console.info;
  sink(line, record.data ?? '');
};
