import { afterEach, describe, expect, it, vi } from 'vitest';
import { consoleTransport, httpTransport } from '../src/transport';
import type { LogRecord } from '../src/types';

const record = (over: Partial<LogRecord> = {}): LogRecord => ({
  app: 'mWeb',
  level: 'info',
  page: 'home',
  component: 'App',
  timestamp: '2024-01-01T00:00:00.000Z',
  ...over,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('httpTransport', () => {
  it('POSTs the record as keepalive JSON to the endpoint', () => {
    const fetchMock = vi.fn(() => Promise.resolve());
    vi.stubGlobal('fetch', fetchMock);
    const rec = record({ data: { a: 1 } });

    httpTransport('https://server.duncit.com/logs')(rec);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://server.duncit.com/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rec),
      keepalive: true,
    });
  });

  it('swallows a rejected fetch (fire-and-forget)', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    expect(() => httpTransport('https://x/logs')(record())).not.toThrow();
  });

  it('swallows a synchronous fetch throw', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('fetch is not a function');
      }),
    );
    expect(() => httpTransport('https://x/logs')(record())).not.toThrow();
  });
});

describe('consoleTransport', () => {
  it('routes each level to its matching console method with the data payload', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    consoleTransport(record({ level: 'error', data: { e: 1 } }));
    consoleTransport(record({ level: 'warn', data: { w: 1 } }));
    consoleTransport(record({ level: 'debug', data: { d: 1 } }));
    consoleTransport(record({ level: 'info', data: { i: 1 } }));

    expect(error).toHaveBeenCalledWith('[mWeb] home/App', { e: 1 });
    expect(warn).toHaveBeenCalledWith('[mWeb] home/App', { w: 1 });
    expect(debug).toHaveBeenCalledWith('[mWeb] home/App', { d: 1 });
    expect(info).toHaveBeenCalledWith('[mWeb] home/App', { i: 1 });
  });

  it('falls back to console.info for an unknown level and empty string for absent data', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    consoleTransport(record({ level: 'trace' as unknown as LogRecord['level'] }));
    expect(info).toHaveBeenCalledWith('[mWeb] home/App', '');
  });

  it('tags portal records as app:portal', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    consoleTransport(record({ app: 'portal', portal: 'crm', page: 'leads', component: 'List' }));
    expect(info).toHaveBeenCalledWith('[portal:crm] leads/List', '');
  });
});
