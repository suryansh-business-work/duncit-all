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
  /* eslint-disable no-console -- structured log transport writes to the console */
  const byLevel = {
    error: console.error,
    warn: console.warn,
    debug: console.debug,
    info: console.info,
  };
  /* eslint-enable no-console */
  const sink = byLevel[record.level as keyof typeof byLevel] ?? byLevel.info;
  sink(line, record.data ?? '');
};
