import { describe, expect, it } from 'vitest';
import {
  BUG_EXPORT_VERSION,
  buildBugExport,
  bugExportFilename,
  parseBugImport,
} from '../../src/pages/bugs-page/bug-io';
import type { BugRow } from '../../src/pages/bugs-page/queries';

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
