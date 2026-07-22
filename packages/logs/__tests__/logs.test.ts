import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureLogs, createLogger, logs, serializeError } from '../src/logs';
import { consoleTransport } from '../src/transport';
import type { LogRecord } from '../src/types';

let sink: LogRecord[];

beforeEach(() => {
  sink = [];
  // Reset the module-wide context to the web default before each test.
  configureLogs(
    (r) => {
      sink.push(r);
    },
    { platform: 'web', environment: undefined, url: undefined, host: undefined },
  );
});

afterEach(() => {
  configureLogs(consoleTransport, { platform: 'web' });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('logs core loggers', () => {
  it('stamps platform, environment, url, host and timestamp on every record', () => {
    vi.stubGlobal('location', { href: 'https://staging.mweb.duncit.com/dash', hostname: 'staging.mweb.duncit.com' });
    logs.server.info('dashboard', 'KpiCard', { kpi: 'revenue' });
    expect(sink).toHaveLength(1);
    expect(sink[0]).toMatchObject({
      app: 'server',
      level: 'info',
      page: 'dashboard',
      component: 'KpiCard',
      platform: 'web',
      environment: 'staging', // detected from the host
      host: 'staging.mweb.duncit.com',
      url: 'https://staging.mweb.duncit.com/dash',
      data: { kpi: 'revenue' },
    });
    expect(sink[0].portal).toBeUndefined();
    expect(sink[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
  });

  it('supports every level and leaves data/error undefined when omitted', () => {
    logs.mWeb.debug('p', 'c');
    logs.mWeb.info('p', 'c');
    logs.mWeb.warn('p', 'c');
    logs.mWeb.error('p', 'c');
    expect(sink.map((r) => r.level)).toEqual(['debug', 'info', 'warn', 'error']);
    expect(sink.every((r) => r.app === 'mWeb' && r.data === undefined && r.error === undefined)).toBe(
      true,
    );
  });

  it('serializes a thrown Error under `error` and keeps the rest as data', () => {
    const boom = new Error('kaboom');
    logs.mWeb.error('/checkout', 'PaymentForm', { error: boom, orderId: 'o1' });
    expect(sink[0].error).toMatchObject({ name: 'Error', message: 'kaboom' });
    expect(sink[0].error?.stack).toContain('kaboom');
    expect(sink[0].data).toEqual({ orderId: 'o1' });
  });

  it('accepts the `err` alias and drops it from data', () => {
    logs.mWeb.error('p', 'c', { err: new Error('x') });
    expect(sink[0].error?.message).toBe('x');
    expect(sink[0].data).toBeUndefined();
  });

  it('tags portal and website loggers', () => {
    logs.portal.crm.error('leads', 'Table', { id: 7 });
    expect(sink[0]).toMatchObject({ app: 'portal', portal: 'crm', level: 'error' });
    logs.website.duncit.warn('home', 'Hero');
    expect(sink[1]).toMatchObject({ app: 'website', portal: 'duncit', level: 'warn' });
    logs.mobileApp.info('feed', 'Story');
    expect(sink[2].app).toBe('mobileApp');
  });
});

describe('createLogger', () => {
  it('builds a bound app logger and a portal logger', () => {
    createLogger('mWeb').info('p', 'c');
    createLogger('portal', 'crm').error('p', 'c', { error: new Error('e') });
    expect(sink[0].app).toBe('mWeb');
    expect(sink[0].portal).toBeUndefined();
    expect(sink[1]).toMatchObject({ app: 'portal', portal: 'crm' });
    expect(sink[1].error?.message).toBe('e');
  });
});

describe('configureLogs context', () => {
  it('honours a native platform with fixed environment + url/host resolvers', () => {
    configureLogs((r) => sink.push(r), {
      platform: 'native',
      environment: 'staging',
      url: () => 'app://pods/123',
      host: () => 'staging.api.duncit.com',
    });
    logs.mobileApp.error('PodDetails', 'BookBtn', { error: new Error('n') });
    expect(sink[0]).toMatchObject({
      platform: 'native',
      environment: 'staging',
      url: 'app://pods/123',
      host: 'staging.api.duncit.com',
    });
  });

  it('resolves environment from a function', () => {
    let env = 'production' as const;
    configureLogs((r) => sink.push(r), { environment: () => env });
    logs.server.info('p', 'c');
    expect(sink[0].environment).toBe('production');
    env = 'production';
  });

  it('falls back to host-detected environment when none is configured', () => {
    // Default context (localhost host) → localhost.
    logs.server.info('p', 'c');
    expect(sink[0].environment).toBe('localhost');
  });

  it('yields undefined url/host when there is no location and no resolver', () => {
    vi.stubGlobal('location', undefined);
    logs.server.warn('p', 'c');
    expect(sink[0].host).toBeUndefined();
    expect(sink[0].url).toBeUndefined();
    expect(sink[0].environment).toBe('localhost'); // empty host → localhost
  });

  it('coerces an empty location hostname/href to undefined', () => {
    vi.stubGlobal('location', { hostname: '', href: '' });
    logs.server.warn('p', 'c');
    expect(sink[0].host).toBeUndefined();
    expect(sink[0].url).toBeUndefined();
  });
});

describe('serializeError', () => {
  it('flattens Errors, objects, primitives and nullish values', () => {
    expect(serializeError(new Error('boom'))).toMatchObject({ name: 'Error', message: 'boom' });
    expect(serializeError({ a: 1 })).toEqual({ name: 'Object', message: '{"a":1}' });
    expect(serializeError('oops')).toEqual({ name: 'string', message: 'oops' });
    expect(serializeError(42)).toEqual({ name: 'number', message: '42' });
    expect(serializeError(null)).toBeUndefined();
    expect(serializeError(undefined)).toBeUndefined();
  });

  it('names an Error with an empty name "Error"', () => {
    const e = new Error('x');
    e.name = '';
    expect(serializeError(e)?.name).toBe('Error');
  });

  it('stringifies a circular object via String() fallback', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(serializeError(circular)).toEqual({ name: 'Object', message: '[object Object]' });
  });
});

describe('emit safety', () => {
  it('never throws when the active transport throws', () => {
    const boom = vi.fn(() => {
      throw new Error('transport exploded');
    });
    configureLogs(boom);
    expect(() => logs.server.error('p', 'c', { a: 1 })).not.toThrow();
    expect(boom).toHaveBeenCalledTimes(1);
  });
});
