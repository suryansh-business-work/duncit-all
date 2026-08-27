import { GraphQLString } from 'graphql';
import { makeContext } from '@test/harness';

/**
 * Every timestamp on this module's GraphQL types is declared `String`, and the
 * String scalar serializes a Date through `valueOf()` — epoch millis, which the
 * Tech console reads back as an Invalid Date and throws a RangeError on mid
 * repaint, taking the whole page down. So the resolver owes the client ISO.
 */

const LAST_SEEN = new Date('2026-08-27T09:15:00.000Z');
const LAST_BLOCKED = new Date('2026-08-26T18:30:00.000Z');
const CREATED = new Date('2026-08-01T05:00:00.000Z');
const UPDATED = new Date('2026-08-20T11:45:00.000Z');

jest.mock('../../rateLimit.service', () => ({
  rateLimitService: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    listRules: jest.fn(),
    rulesTable: jest.fn(),
    systems: jest.fn(),
    eventsTable: jest.fn(),
  },
}));

import { rateLimitResolvers } from '../../rateLimit.resolver';

const service = jest.requireMock('../../rateLimit.service').rateLimitService as Record<
  string,
  jest.Mock
>;

const ctx = makeContext({ id: '64b7c0f2a1b2c3d4e5f60001', roles: ['TECH_MANAGER'] });

/** What the portal's date cells actually need: a string `new Date` can parse. */
const expectReadableIso = (value: unknown, expected: Date) => {
  expect(typeof value).toBe('string');
  expect(value).toBe(expected.toISOString());
  expect(Number.isNaN(new Date(value as string).getTime())).toBe(false);
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('rate limit resolvers serialize timestamps as ISO', () => {
  it('rateLimitSystems sends last_seen_at as a parseable string', async () => {
    service.systems.mockResolvedValue([
      {
        _id: '64b7c0f2a1b2c3d4e5f60002',
        surface: 'PORTAL',
        app: 'tech',
        label: 'Tech Portal',
        requests: 1204,
        blocked: 3,
        rule_count: 2,
        last_seen_at: LAST_SEEN,
      },
    ]);

    const [row] = await rateLimitResolvers.Query.rateLimitSystems({}, {}, ctx);

    expect(row.id).toBe('64b7c0f2a1b2c3d4e5f60002');
    expectReadableIso(row.last_seen_at, LAST_SEEN);
  });

  it('a system that has never called keeps a null last_seen_at', async () => {
    service.systems.mockResolvedValue([
      { _id: '64b7c0f2a1b2c3d4e5f60003', app: 'mweb', last_seen_at: null },
    ]);

    const [row] = await rateLimitResolvers.Query.rateLimitSystems({}, {}, ctx);

    expect(row.last_seen_at).toBeNull();
  });

  it('rules carry ISO timestamps through toObject()', async () => {
    service.listRules.mockResolvedValue([
      {
        toObject: () => ({
          _id: '64b7c0f2a1b2c3d4e5f60004',
          name: 'Portal GraphQL ceiling',
          last_blocked_at: LAST_BLOCKED,
          last_hit_at: null,
          created_at: CREATED,
          updated_at: UPDATED,
        }),
      },
    ]);

    const [rule] = await rateLimitResolvers.Query.rateLimitRules({}, {}, ctx);

    expect(rule.id).toBe('64b7c0f2a1b2c3d4e5f60004');
    expectReadableIso(rule.last_blocked_at, LAST_BLOCKED);
    expectReadableIso(rule.created_at, CREATED);
    expectReadableIso(rule.updated_at, UPDATED);
    expect(rule.last_hit_at).toBeNull();
  });

  it('breach rows send created_at as ISO', async () => {
    service.eventsTable.mockResolvedValue({
      total: 1,
      rows: [{ _id: '64b7c0f2a1b2c3d4e5f60005', rule_name: 'Upload ceiling', created_at: CREATED }],
    });

    const page = await rateLimitResolvers.Query.rateLimitEventsTable({}, {}, ctx);

    expect(page.total).toBe(1);
    expectReadableIso(page.rows[0].created_at, CREATED);
  });

  it('settings send updated_at as ISO on read and on write', async () => {
    service.getSettings.mockResolvedValue({ enabled: true, updated_at: UPDATED });
    service.updateSettings.mockResolvedValue({ enabled: false, updated_at: UPDATED });

    const read = await rateLimitResolvers.Query.rateLimitSettings({}, {}, ctx);
    const written = await rateLimitResolvers.Mutation.updateRateLimitSettings(
      {},
      { input: { enabled: false } },
      ctx,
    );

    expectReadableIso(read.updated_at, UPDATED);
    expectReadableIso(written.updated_at, UPDATED);
  });

  it('a raw Date would have left as epoch millis — the bug this guards', () => {
    // Why the resolver converts at all: the scalar itself does not.
    expect(GraphQLString.serialize(LAST_SEEN)).toBe(String(LAST_SEEN.getTime()));
    expect(Number.isNaN(new Date(String(LAST_SEEN.getTime())).getTime())).toBe(true);
  });

  it('still refuses a caller without the Tech role', async () => {
    const outsider = makeContext({ id: '64b7c0f2a1b2c3d4e5f60006', roles: ['CITY_ADMIN'] });
    await expect(rateLimitResolvers.Query.rateLimitSystems({}, {}, outsider)).rejects.toThrow(
      'Access Denied',
    );
  });
});
