import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureLogs, logs } from '../src/logs';
import { consoleTransport } from '../src/transport';
import type { LogRecord } from '../src/types';

let sink: LogRecord[];

beforeEach(() => {
  sink = [];
  configureLogs((r) => {
    sink.push(r);
  });
});

afterEach(() => {
  // Restore the process-wide default so no test leaks its transport.
  configureLogs(consoleTransport);
  vi.restoreAllMocks();
});

describe('logs core loggers', () => {
  it('emits a fully-formed record for a top-level app logger', () => {
    logs.server.info('dashboard', 'KpiCard', { kpi: 'revenue' });
    expect(sink).toHaveLength(1);
    expect(sink[0]).toMatchObject({
      app: 'server',
      level: 'info',
      page: 'dashboard',
      component: 'KpiCard',
      data: { kpi: 'revenue' },
    });
    expect(sink[0].portal).toBeUndefined();
    expect(sink[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
  });

  it('supports every level and leaves data undefined when omitted', () => {
    logs.mWeb.debug('p', 'c');
    logs.mWeb.info('p', 'c');
    logs.mWeb.warn('p', 'c');
    logs.mWeb.error('p', 'c');
    expect(sink.map((r) => r.level)).toEqual(['debug', 'info', 'warn', 'error']);
    expect(sink.every((r) => r.app === 'mWeb' && r.data === undefined)).toBe(true);
  });

  it('tags portal loggers with app=portal and the portal key', () => {
    logs.portal.crm.error('leads', 'Table', { id: 7 });
    expect(sink[0]).toMatchObject({ app: 'portal', portal: 'crm', level: 'error' });
  });

  it('tags website loggers with app=website and the website key', () => {
    logs.website.duncit.warn('home', 'Hero');
    expect(sink[0]).toMatchObject({ app: 'website', portal: 'duncit', level: 'warn' });
  });

  it('routes the mobile app logger under app=mobileApp', () => {
    logs.mobileApp.info('feed', 'Story');
    expect(sink[0].app).toBe('mobileApp');
  });
});

describe('configureLogs / emit safety', () => {
  it('never throws when the active transport throws', () => {
    const boom = vi.fn(() => {
      throw new Error('transport exploded');
    });
    configureLogs(boom);
    expect(() => logs.server.error('p', 'c', { a: 1 })).not.toThrow();
    expect(boom).toHaveBeenCalledTimes(1);
  });

  it('swaps the active transport for subsequent calls', () => {
    const first: LogRecord[] = [];
    const second: LogRecord[] = [];
    configureLogs((r) => first.push(r));
    logs.server.info('p', 'c');
    configureLogs((r) => second.push(r));
    logs.server.info('p', 'c');
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
  });
});
