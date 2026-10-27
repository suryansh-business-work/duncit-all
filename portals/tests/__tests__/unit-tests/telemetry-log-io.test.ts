import { describe, expect, it } from 'vitest';
import {
  LOG_EXPORT_VERSION,
  buildLogExport,
  logExportFilename,
  parseLogImport,
} from '../../src/pages/telemetry-logs-page/log-io';
import type { TelemetryLogRow } from '../../src/pages/telemetry-logs-page/queries';

const row = (over: Record<string, unknown> = {}): TelemetryLogRow =>
  ({
    __typename: 'TelemetryLog',
    id: 'l1',
    app: 'mweb',
    portal: null,
    platform: 'web',
    os: 'iOS',
    environment: 'production',
    source: 'mweb:home',
    level: 'error',
    page: '/home',
    component: 'Header',
    url: 'https://mweb.duncit.com/home',
    host: 'mweb.duncit.com',
    error: { __typename: 'E', name: 'TypeError', message: 'x is undefined', stack: 'at foo' },
    data_json: '{"a":1}',
    user: { __typename: 'U', id: 'u1', name: 'Asha', email: 'a@example.test', phone: null, roles: ['USER'] },
    user_id: 'u1',
    client: {
      __typename: 'C',
      app_version: '1.2.3',
      device_model: 'Pixel',
      device_os_version: '14',
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
      screen: '1080x2400',
      viewport: '400x800',
      network: '4g',
      referrer: null,
    },
    duid: 'd1',
    session_id: 's1',
    ip: '10.0.0.1',
    user_agent: 'UA',
    created_at: '2026-08-14T10:00:00.000Z',
    ...over,
  }) as unknown as TelemetryLogRow;

describe('buildLogExport', () => {
  it('writes a versioned file field by field, without Apollo typenames or the denormalised user_id', () => {
    const file = buildLogExport([row()], 'error', '2026-08-14T12:00:00.000Z');
    expect(file).toMatchObject({
      duncit_logs_export: LOG_EXPORT_VERSION,
      level: 'error',
      exported_at: '2026-08-14T12:00:00.000Z',
    });
    const [entry] = file.logs;
    expect(JSON.stringify(file)).not.toContain('__typename');
    expect(entry).not.toHaveProperty('user_id');
    expect(entry.error).toEqual({ name: 'TypeError', message: 'x is undefined', stack: 'at foo' });
    expect(entry.user).toEqual({ id: 'u1', name: 'Asha', email: 'a@example.test', phone: null, roles: ['USER'] });
    expect(entry.client).toMatchObject({ app_version: '1.2.3', referrer: null });
  });

  it('keeps absent error, user and client as null', () => {
    const [entry] = buildLogExport([row({ error: null, user: null, client: null })], 'error', 'x').logs;
    expect(entry.error).toBeNull();
    expect(entry.user).toBeNull();
    expect(entry.client).toBeNull();
  });

  it('names the file by level and the day it was taken', () => {
    expect(logExportFilename('warn', '2026-08-14T23:59:59.000Z')).toBe('duncit-logs-warn-2026-08-14.json');
  });
});

describe('parseLogImport', () => {
  const minimal = { app: 'mweb', level: 'error', page: '/p', component: 'C' };
  const file = (logs: unknown[], extra: Record<string, unknown> = {}) =>
    JSON.stringify({ duncit_logs_export: 1, logs, ...extra });

  it('round-trips an exported file back into entries', () => {
    const exported = buildLogExport([row()], 'error', '2026-08-14T12:00:00.000Z');
    const parsed = parseLogImport(JSON.stringify(exported));
    expect('logs' in parsed).toBe(true);
    const [entry] = (parsed as { logs: Record<string, unknown>[] }).logs;
    expect(entry).toMatchObject({
      id: 'l1',
      app: 'mweb',
      level: 'error',
      error: { name: 'TypeError', message: 'x is undefined', stack: 'at foo' },
      user: { id: 'u1', name: 'Asha', roles: ['USER'] },
      client: { app_version: '1.2.3', locale: 'en-IN' },
    });
    // null / blank fields are dropped rather than sent as null to a non-null input
    expect((entry.user as Record<string, unknown>).phone).toBeUndefined();
    expect((entry.client as Record<string, unknown>).referrer).toBeUndefined();
  });

  it('accepts a hand-trimmed file carrying only the identity fields', () => {
    const parsed = parseLogImport(file([minimal]));
    expect(parsed).toEqual({
      logs: [{ app: 'mweb', level: 'error', page: '/p', component: 'C', error: undefined, user: undefined, client: undefined }],
    });
  });

  it('drops an error without a message and a user without an id', () => {
    const parsed = parseLogImport(
      file([{ ...minimal, error: { name: 'E' }, user: { name: 'No id' }, client: 'nope' }]),
    ) as { logs: Record<string, unknown>[] };
    expect(parsed.logs[0].error).toBeUndefined();
    expect(parsed.logs[0].user).toBeUndefined();
    expect(parsed.logs[0].client).toBeUndefined();
  });

  it('keeps only string roles on an imported user', () => {
    const parsed = parseLogImport(
      file([{ ...minimal, user: { id: 'u9', roles: ['ADMIN', 5, null] } }]),
    ) as { logs: Array<{ user: { id: string; roles: string[] } }> };
    expect(parsed.logs[0].user).toEqual({ id: 'u9', roles: ['ADMIN'] });
  });

  it('leaves roles undefined when the file gave none', () => {
    const parsed = parseLogImport(file([{ ...minimal, user: { id: 'u9', roles: 'ADMIN' } }])) as {
      logs: Array<{ user: { roles?: string[] } }>;
    };
    expect(parsed.logs[0].user.roles).toBeUndefined();
  });

  it('rejects text that is not JSON', () => {
    expect(parseLogImport('{oops')).toEqual({ error: 'That file is not valid JSON.' });
  });

  it.each([['an array', '[]'], ['a primitive', '5'], ['an object with no logs list', '{"logs": 3}']])(
    'rejects %s',
    (_name, text) => {
      expect(parseLogImport(text)).toEqual({
        error: 'That file is not a logs export — it has no "logs" list.',
      });
    },
  );

  it('refuses a file written by a newer version', () => {
    const parsed = parseLogImport(file([minimal], { duncit_logs_export: LOG_EXPORT_VERSION + 1 }));
    expect(parsed).toEqual({ error: `That file was written by a newer version (${LOG_EXPORT_VERSION + 1}) of this page.` });
  });

  it('does not treat a non-numeric version marker as newer', () => {
    expect('logs' in parseLogImport(file([minimal], { duncit_logs_export: 'two' }))).toBe(true);
  });

  it.each([
    ['a blank app', { ...minimal, app: '  ' }],
    ['a missing level', { ...minimal, level: undefined }],
    ['a non-string page', { ...minimal, page: 4 }],
    ['an empty component', { ...minimal, component: '' }],
    ['a row that is not an object', 'row'],
  ])('rejects the whole file when a row has %s', (_name, bad) => {
    const parsed = parseLogImport(file([minimal, bad]));
    expect(parsed).toEqual({
      error: 'One of the logs is missing its app, level, page or component, so nothing was imported.',
    });
  });

  it('rejects an empty list', () => {
    expect(parseLogImport(file([]))).toEqual({ error: 'That file has no logs in it.' });
  });
});
