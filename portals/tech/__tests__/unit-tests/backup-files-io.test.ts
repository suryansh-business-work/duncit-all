import { describe, expect, it } from 'vitest';
import {
  BUG_EXPORT_VERSION,
  buildBugExport,
  bugExportFilename,
  parseBugImport,
} from '../../src/pages/bugs-page/bug-io';
import type { BugRow } from '../../src/pages/bugs-page/queries';
import {
  ENV_EXPORT_VERSION,
  buildEnvExport,
  envExportFilename,
  parseEnvImport,
} from '../../src/pages/environment/env-io';
import {
  FLAG_EXPORT_VERSION,
  buildFlagExport,
  flagExportFilename,
  parseFlagImport,
} from '../../src/pages/feature-flags-page/flag-io';
import { makeEnvEntry, makeFeatureFlagRow } from '../mocks';

const makeBug = (over: Partial<BugRow> = {}): BugRow => ({
  id: 'b1',
  fingerprint: 'fp-1',
  title: 'Boom',
  error_name: 'TypeError',
  message: 'x is undefined',
  page: '/home',
  source: 'mweb:home',
  app: 'mweb',
  portal: null,
  platform: 'web',
  os: 'Windows',
  occurrence_count: 4,
  first_seen_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-02T00:00:00.000Z',
  env_counts: { localhost: 1, staging: 2, production: 1 },
  last_url: 'https://x/y',
  last_host: 'x',
  last_stack: 'stack',
  last_user: null,
  last_environment: 'production',
  last_app_version: '1.0.0',
  last_user_agent: 'UA',
  last_duid: 'duid',
  last_session_id: 'sess',
  last_ip: '1.2.3.4',
  last_client: null,
  affected_user_count: 2,
  affected_user_ids: ['u1', 'u2'],
  anonymous_count: 1,
  status: 'OPEN',
  resolved_at: null,
  resolved_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('bug-io', () => {
  it('exports bugs by fingerprint without ids, ips or apollo typenames', () => {
    const user = {
      __typename: 'User',
      id: 'u1',
      name: 'Asha',
      email: 'a@x.com',
      phone: null,
      roles: ['ADMIN'],
    };
    const file = buildBugExport(
      [makeBug({ last_user: user as never }), makeBug({ fingerprint: 'fp-2', last_user: null })],
      '2026-08-14T10:00:00.000Z',
    );
    expect(file.duncit_bugs_export).toBe(BUG_EXPORT_VERSION);
    expect(file.bugs).toHaveLength(2);
    expect(file.bugs[0]).not.toHaveProperty('id');
    expect(file.bugs[0]).not.toHaveProperty('last_ip');
    expect(file.bugs[0].last_user).toEqual({
      id: 'u1',
      name: 'Asha',
      email: 'a@x.com',
      phone: null,
      roles: ['ADMIN'],
    });
    expect(file.bugs[1].last_user).toBeNull();
  });

  it('names the file after the day it was taken', () => {
    expect(bugExportFilename('2026-08-14T10:00:00.000Z')).toBe('duncit-bugs-2026-08-14.json');
  });

  it('round-trips its own export', () => {
    const file = buildBugExport([makeBug()], '2026-08-14T10:00:00.000Z');
    const parsed = parseBugImport(JSON.stringify(file));
    expect(parsed).toEqual({ bugs: file.bugs });
  });

  it('rejects text that is not JSON', () => {
    expect(parseBugImport('{nope')).toEqual({ error: 'That file is not valid JSON.' });
  });

  it('rejects JSON without a bugs list', () => {
    expect(parseBugImport('[]')).toEqual({
      error: 'That file is not a bugs export — it has no "bugs" list.',
    });
    expect(parseBugImport('{"bugs":"x"}')).toMatchObject({ error: expect.stringContaining('no "bugs"') });
  });

  it('rejects the whole file when a row lacks its identity', () => {
    const rows = [
      { fingerprint: 'a', title: 't', page: 'p', source: 's' },
      { fingerprint: '   ', title: 't', page: 'p', source: 's' },
    ];
    expect(parseBugImport(JSON.stringify({ bugs: rows }))).toMatchObject({
      error: expect.stringContaining('missing its fingerprint'),
    });
    expect(parseBugImport(JSON.stringify({ bugs: [5] }))).toMatchObject({
      error: expect.stringContaining('missing its fingerprint'),
    });
  });

  it('rejects an empty list', () => {
    expect(parseBugImport('{"bugs":[]}')).toEqual({ error: 'That file has no bugs in it.' });
  });

  it('defaults everything the file left out', () => {
    const result = parseBugImport(
      JSON.stringify({ bugs: [{ fingerprint: 'fp', title: 'T', page: '/p', source: 'native:home' }] }),
    );
    expect(result).toEqual({
      bugs: [
        expect.objectContaining({
          fingerprint: 'fp',
          error_name: 'Error',
          message: '',
          app: 'native',
          portal: null,
          platform: 'unknown',
          occurrence_count: 1,
          env_counts: { localhost: 0, staging: 0, production: 0 },
          last_user: null,
          affected_user_ids: [],
          affected_user_count: 0,
          status: 'OPEN',
        }),
      ],
    });
  });

  it('keeps usable values, filters bad ones and honours known statuses', () => {
    const result = parseBugImport(
      JSON.stringify({
        bugs: [
          {
            fingerprint: 'fp',
            title: 'T',
            page: '/p',
            source: 'mweb:x',
            app: 'custom',
            occurrence_count: 9,
            affected_user_count: Number.NaN,
            env_counts: { staging: 3 },
            affected_user_ids: ['a', 7, 'b'],
            last_user: { id: 'u9', name: 'N', roles: ['A', 3] },
            status: 'RESOLVED',
          },
          {
            fingerprint: 'fp2',
            title: 'T',
            page: '/p',
            source: 'mweb:x',
            last_user: { id: '' },
            status: 'IGNORED',
          },
          {
            fingerprint: 'fp3',
            title: 'T',
            page: '/p',
            source: 'mweb:x',
            last_user: { id: 'u2', roles: 'ADMIN' },
            affected_user_ids: 'nope',
            status: 'BOGUS',
          },
        ],
      }),
    );
    if (!('bugs' in result)) throw new Error('expected bugs');
    const [a, b, c] = result.bugs;
    expect(a).toMatchObject({
      app: 'custom',
      occurrence_count: 9,
      affected_user_count: 0,
      env_counts: { localhost: 0, staging: 3, production: 0 },
      affected_user_ids: ['a', 'b'],
      last_user: { id: 'u9', name: 'N', email: null, phone: null, roles: ['A'] },
      status: 'RESOLVED',
    });
    expect(b).toMatchObject({ last_user: null, status: 'IGNORED' });
    expect(c).toMatchObject({
      last_user: { id: 'u2', roles: [] },
      affected_user_ids: [],
      status: 'OPEN',
    });
  });
});

describe('env-io', () => {
  it('exports real keys and values with no ids', () => {
    const file = buildEnvExport(
      [
        makeEnvEntry({
          description: null,
          assigned_portals: ['tech'],
          config: [{ __typename: 'EnvConfigPair', key: 'host', value: 'smtp.example.com' }] as never,
        }),
      ],
      '2026-08-11T09:00:00.000Z',
    );
    expect(file.duncit_env_export).toBe(ENV_EXPORT_VERSION);
    expect(file.entries).toEqual([
      {
        name: 'SMTP One',
        category: 'EMAIL',
        description: '',
        is_default: false,
        is_active: true,
        assigned_portals: ['tech'],
        config: { host: 'smtp.example.com' },
      },
    ]);
  });

  it('names the file by scope and day', () => {
    expect(envExportFilename('EMAIL', '2026-08-11T09:00:00.000Z')).toBe(
      'duncit-env-EMAIL-2026-08-11.json',
    );
  });

  it('rejects invalid JSON and files without entries', () => {
    expect(parseEnvImport('x')).toEqual({ error: 'That file is not valid JSON.' });
    expect(parseEnvImport('{"entries":3}')).toMatchObject({
      error: expect.stringContaining('no "entries" list'),
    });
    expect(parseEnvImport('null')).toMatchObject({ error: expect.stringContaining('no "entries"') });
  });

  it('rejects the whole file when an entry has no name or category', () => {
    const bad = JSON.stringify({ entries: [{ name: 'a', category: 'X' }, { name: 'b' }] });
    expect(parseEnvImport(bad)).toMatchObject({ error: expect.stringContaining('nothing was imported') });
    expect(parseEnvImport('{"entries":[{"category":"EMAIL"}]}')).toMatchObject({
      error: expect.stringContaining('nothing was imported'),
    });
    expect(parseEnvImport('{"entries":["s"]}')).toMatchObject({
      error: expect.stringContaining('nothing was imported'),
    });
  });

  it('rejects an empty list', () => {
    expect(parseEnvImport('{"entries":[]}')).toEqual({ error: 'That file has no entries in it.' });
  });

  it('turns config back into pairs, stringifying non-strings and dropping nulls', () => {
    const text = JSON.stringify({
      entries: [
        {
          name: 'n',
          category: 'EMAIL',
          description: 5,
          is_default: true,
          is_active: false,
          assigned_portals: ['a', 2],
          config: { host: 'h', port: 587, tls: true, nothing: null, list: [1] },
        },
        { name: 'm', category: 'EMAIL', config: 'bad' },
      ],
    });
    const result = parseEnvImport(text);
    if (!('entries' in result)) throw new Error('expected entries');
    expect(result.entries[0]).toEqual({
      name: 'n',
      category: 'EMAIL',
      description: '',
      is_default: true,
      is_active: false,
      assigned_portals: ['a'],
      config: [
        { key: 'host', value: 'h' },
        { key: 'port', value: '587' },
        { key: 'tls', value: 'true' },
        { key: 'list', value: '[1]' },
      ],
    });
    expect(result.entries[1]).toMatchObject({
      is_default: false,
      is_active: true,
      assigned_portals: [],
      config: [],
    });
  });
});

describe('flag-io', () => {
  it('exports flags by key without ids or system markers', () => {
    const file = buildFlagExport(
      [makeFeatureFlagRow({ key: 'beta', name: 'Beta', description: '', enabled: true })],
      '2026-08-11T09:00:00.000Z',
    );
    expect(file.duncit_flag_export).toBe(FLAG_EXPORT_VERSION);
    expect(file.flags).toEqual([{ key: 'beta', name: 'Beta', description: '', enabled: true }]);
    expect(flagExportFilename('2026-08-11T09:00:00.000Z')).toBe('duncit-feature-flags-2026-08-11.json');
  });

  it('defaults a missing description to an empty string on export', () => {
    const row = { ...makeFeatureFlagRow(), description: null } as never;
    expect(buildFlagExport([row], '2026-08-11T00:00:00.000Z').flags[0].description).toBe('');
  });

  it('rejects invalid JSON, missing list, bad rows and empty lists', () => {
    expect(parseFlagImport('{')).toEqual({ error: 'That file is not valid JSON.' });
    expect(parseFlagImport('{"flags":1}')).toMatchObject({ error: expect.stringContaining('no "flags"') });
    expect(parseFlagImport('{"flags":[{"key":"a"}]}')).toMatchObject({
      error: expect.stringContaining('nothing was imported'),
    });
    expect(parseFlagImport('{"flags":[null]}')).toMatchObject({
      error: expect.stringContaining('nothing was imported'),
    });
    expect(parseFlagImport('{"flags":[]}')).toEqual({ error: 'That file has no flags in it.' });
  });

  it('only enables a flag when the file says exactly true', () => {
    const result = parseFlagImport(
      JSON.stringify({
        flags: [
          { key: 'a', name: 'A', description: 'd', enabled: true },
          { key: 'b', name: 'B', enabled: 'true' },
        ],
      }),
    );
    expect(result).toEqual({
      flags: [
        { key: 'a', name: 'A', description: 'd', enabled: true },
        { key: 'b', name: 'B', description: '', enabled: false },
      ],
    });
  });
});
