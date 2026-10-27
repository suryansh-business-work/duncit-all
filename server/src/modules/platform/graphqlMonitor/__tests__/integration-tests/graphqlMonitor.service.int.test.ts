/**
 * What the GraphQL Monitor console reads, against a real database: the
 * operation list and overview from the rollups, one operation with its
 * traces, the field list from the live schema (a field nobody called still
 * shows, at zero) and the error groups.
 */
jest.mock('../../graphqlMonitor.plugin', () => ({ currentSchema: jest.fn() }));

import { buildSchema } from 'graphql';
import { Types } from 'mongoose';
import { graphqlMonitorService } from '../../graphqlMonitor.service';
import { currentSchema } from '../../graphqlMonitor.plugin';
import {
  ALL_OPERATIONS_KEY,
  GraphqlErrorStatModel,
  GraphqlFieldStatModel,
  GraphqlOperationModel,
  GraphqlOperationStatModel,
  GraphqlTraceModel,
} from '../../graphqlMonitor.model';

const HOUR = 3_600_000;
const MIN = 60_000;
const hourNow = Math.floor(Date.now() / HOUR) * HOUR;
const minuteNow = Math.floor(Date.now() / MIN) * MIN;
const expires = new Date(Date.now() + 7 * 86_400_000);

const stat = (over: Record<string, unknown>) =>
  GraphqlOperationStatModel.create({
    granularity: 'HOUR',
    bucket_start: new Date(hourNow),
    op_key: 'op1',
    requests: 10,
    errors: 2,
    cached: 1,
    executed: 9,
    duration_total_ms: 1000,
    duration_max_ms: 400,
    parse_total_ms: 10,
    validate_total_ms: 20,
    execute_total_ms: 900,
    hist: { b10: 6, b20: 4 },
    clients: { web: 7, ios: 3 },
    error_codes: { INTERNAL: 2 },
    last_seen_at: new Date(hourNow + 1000),
    expires_at: expires,
    ...over,
  });

const registry = (over: Record<string, unknown> = {}) =>
  GraphqlOperationModel.create({
    op_key: 'op1', name: 'GetMe', type: 'QUERY', signature: 'query GetMe{me{id}}', root_fields: ['me'], fields: ['Query.me', 'User.id'],
    first_seen_at: new Date('2026-01-01T00:00:00Z'), last_seen_at: new Date(), expires_at: expires, ...over,
  });

describe('overview', () => {
  it('sums the all-operations rollup and counts the distinct operations behind it', async () => {
    await stat({ op_key: ALL_OPERATIONS_KEY, requests: 30, errors: 3 });
    await stat({ op_key: 'op1' });
    await stat({ op_key: 'op2' });
    const out = await graphqlMonitorService.overview('LAST_24_HOURS');
    expect(out).toMatchObject({ requests: 30, errors: 3, operation_count: 2 });
    expect(out.clients).toEqual([{ label: 'web', count: 7 }, { label: 'ios', count: 3 }]);
    expect(out.error_codes).toEqual([{ label: 'INTERNAL', count: 2 }]);
    expect(out.series.length).toBeGreaterThan(0);
    expect(out.series.at(-1)).toMatchObject({ requests: 30 });
  });

  it('is all zeros when nothing was counted, and defaults to the last 24 hours', async () => {
    const out = await graphqlMonitorService.overview();
    expect(out).toMatchObject({ requests: 0, errors: 0, operation_count: 0, clients: [], error_codes: [], p95_ms: 0, last_seen_at: null });
  });

  it('refuses an unknown range', async () => {
    await expect(graphqlMonitorService.overview('LAST_CENTURY')).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });
});

describe('operations', () => {
  it('lists every operation with its registry name and numbers, falling back for one the registry has not seen', async () => {
    await registry();
    await stat({ op_key: 'op1' });
    await stat({ op_key: 'ghost', requests: 1, errors: 0, hist: {} });
    await stat({ op_key: ALL_OPERATIONS_KEY, requests: 11 });
    const rows = await graphqlMonitorService.operations('LAST_7_DAYS');
    expect(rows).toHaveLength(2);
    const known = rows.find((r) => r.id === 'op1');
    expect(known).toMatchObject({ name: 'GetMe', type: 'QUERY', root_fields: ['me'], requests: 10, errors: 2, error_rate_pct: 20, avg_ms: 100 });
    expect(known?.p95_ms).toBeGreaterThan(0);
    expect(rows.find((r) => r.id === 'ghost')).toMatchObject({ name: 'ghost', type: 'UNKNOWN', root_fields: [], requests: 1, p50_ms: 0 });
  });

  it('reads minute rollups for a short range', async () => {
    await stat({ granularity: 'MINUTE', bucket_start: new Date(minuteNow), op_key: 'op1', requests: 5, errors: 0 });
    await stat({ granularity: 'HOUR', op_key: 'op1', requests: 99 });
    const rows = await graphqlMonitorService.operations('LAST_HOUR');
    expect(rows.map((r) => r.requests)).toEqual([5]);
  });
});

describe('operation', () => {
  it('shows one operation with its signature, series, latency distribution, clients and codes', async () => {
    await registry();
    await stat({});
    const out = await graphqlMonitorService.operation('op1', 'LAST_30_DAYS');
    expect(out).toMatchObject({
      id: 'op1', name: 'GetMe', type: 'QUERY', signature: 'query GetMe{me{id}}', root_fields: ['me'], fields: ['Query.me', 'User.id'],
      first_seen_at: '2026-01-01T00:00:00.000Z', requests: 10,
    });
    expect(out.latency_distribution.length).toBeGreaterThan(0);
    expect(out.clients[0]).toEqual({ label: 'web', count: 7 });
    expect(out.error_codes).toEqual([{ label: 'INTERNAL', count: 2 }]);
    expect(out.series.some((p) => p.requests === 10)).toBe(true);
  });

  it('shows zeros for an operation with no traffic in the range', async () => {
    await registry();
    const out = await graphqlMonitorService.operation('op1');
    expect(out).toMatchObject({ requests: 0, latency_distribution: [], clients: [], error_codes: [] });
  });

  it('refuses an operation it has never seen', async () => {
    await expect(graphqlMonitorService.operation('nope')).rejects.toMatchObject({ message: 'Operation not found', extensions: { code: 'NOT_FOUND' } });
  });
});

describe('traces', () => {
  const trace = (over: Record<string, unknown>) =>
    GraphqlTraceModel.create({ op_key: 'op1', bucket_start: new Date(hourNow), at: new Date(hourNow + 5000), duration_ms: 100, expires_at: expires, resolvers: [{ path: 'me' }], ...over });

  it('lists the slowest traces first without their resolver detail, at most 25', async () => {
    for (let i = 0; i < 27; i += 1) await trace({ bucket_start: new Date(hourNow - i * HOUR), duration_ms: 100 + i });
    const rows = await graphqlMonitorService.traces('op1');
    expect(rows).toHaveLength(25);
    expect(rows[0].duration_ms).toBe(126);
    expect(rows[0]).toMatchObject({ id: expect.any(String), at: expect.any(String) });
    expect(rows[0]).not.toHaveProperty('resolvers');
    expect(rows[0]).not.toHaveProperty('_id');
  });

  it('shows one trace with its resolvers', async () => {
    const doc = await trace({ client: 'web' });
    const out = await graphqlMonitorService.trace(String(doc._id));
    expect(out).toMatchObject({ id: String(doc._id), op_key: 'op1', client: 'web', resolvers: [{ path: 'me' }] });
    expect(out.at).toBe(new Date(hourNow + 5000).toISOString());
  });

  it('refuses an unknown or malformed trace id', async () => {
    await expect(graphqlMonitorService.trace(String(new Types.ObjectId()))).rejects.toMatchObject({ message: 'Trace not found', extensions: { code: 'NOT_FOUND' } });
    await expect(graphqlMonitorService.trace('not-an-id')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('fields', () => {
  const schema = buildSchema(`
    type Query { "the caller" me: User, ping(echo: String!): String @deprecated(reason: "use me") }
    type Mutation { rename(name: String!): User }
    type Subscription { tick: Int }
    interface Node { id: ID! }
    type User implements Node { id: ID!, name: String }
  `);

  it('is empty before the schema is known', async () => {
    (currentSchema as jest.Mock).mockReturnValue(null);
    await expect(graphqlMonitorService.fields()).resolves.toEqual([]);
  });

  it('lists every schema field, with usage where there is some and zeros where there is none', async () => {
    (currentSchema as jest.Mock).mockReturnValue(schema);
    await GraphqlFieldStatModel.create({
      bucket_start: new Date(hourNow), coordinate: 'Query.me', referenced: 40, sampled_calls: 4, sampled_errors: 1,
      duration_total_ms: 80, duration_max_ms: 33.33, last_seen_at: new Date(hourNow + 7), expires_at: expires,
    });
    await GraphqlFieldStatModel.create({
      bucket_start: new Date(hourNow - HOUR), coordinate: 'Query.me', referenced: 10, sampled_calls: 0, sampled_errors: 0,
      duration_total_ms: 0, duration_max_ms: 0, last_seen_at: new Date(hourNow - HOUR), expires_at: expires,
    });
    await GraphqlFieldStatModel.create({ bucket_start: new Date(hourNow), coordinate: 'User.name', referenced: 3, expires_at: expires });
    const rows = await graphqlMonitorService.fields('LAST_24_HOURS');
    const byCoordinate = Object.fromEntries(rows.map((r) => [r.coordinate, r]));
    expect(Object.keys(byCoordinate).sort()).toEqual(
      ['Mutation.rename', 'Node.id', 'Query.me', 'Query.ping', 'Subscription.tick', 'User.id', 'User.name'].sort()
    );
    expect(byCoordinate['Query.me']).toMatchObject({
      parent_type: 'Query', field_name: 'me', kind: 'QUERY', return_type: 'User', arguments: [], referenced: 50, sampled_calls: 4,
      error_rate_pct: 25, avg_ms: 20, max_ms: 33.3, description: 'the caller', deprecation_reason: null, last_seen_at: new Date(hourNow + 7).toISOString(),
    });
    expect(byCoordinate['Query.ping']).toMatchObject({ return_type: 'String', arguments: ['echo: String!'], deprecation_reason: 'use me', referenced: 0, sampled_calls: 0, error_rate_pct: 0, avg_ms: 0, max_ms: 0, last_seen_at: null });
    expect(byCoordinate['Mutation.rename'].kind).toBe('MUTATION');
    expect(byCoordinate['Subscription.tick'].kind).toBe('SUBSCRIPTION');
    expect(byCoordinate['User.name']).toMatchObject({ kind: 'TYPE', referenced: 3, sampled_calls: 0, error_rate_pct: 0, avg_ms: 0 });
    expect(byCoordinate['Node.id'].kind).toBe('TYPE');
  });

  it('counts only usage inside the range, reading whole hours', async () => {
    (currentSchema as jest.Mock).mockReturnValue(schema);
    await GraphqlFieldStatModel.create({ bucket_start: new Date(hourNow - 3 * HOUR), coordinate: 'Query.me', referenced: 5, expires_at: expires });
    const lastHour = await graphqlMonitorService.fields('LAST_HOUR');
    expect(lastHour.find((r) => r.coordinate === 'Query.me')?.referenced).toBe(0);
    const day = await graphqlMonitorService.fields('LAST_24_HOURS');
    expect(day.find((r) => r.coordinate === 'Query.me')?.referenced).toBe(5);
  });
});

describe('errors', () => {
  const group = (over: Record<string, unknown>) =>
    GraphqlErrorStatModel.create({
      bucket_start: new Date(hourNow), group_key: 'g1', op_key: 'op1', code: 'INTERNAL', path: 'me', message: 'boom', count: 3,
      first_seen_at: new Date(hourNow + 1000), last_seen_at: new Date(hourNow + 2000), expires_at: expires, ...over,
    });

  it('groups errors across hours, biggest first, naming the operation they came from', async () => {
    await registry();
    await group({});
    await group({ bucket_start: new Date(hourNow - HOUR), count: 4, first_seen_at: new Date(hourNow - HOUR + 500), last_seen_at: new Date(hourNow - HOUR + 600) });
    await group({ group_key: 'g2', op_key: 'ghost', count: 1, code: 'BAD_USER_INPUT', message: 'bad' });
    const rows = await graphqlMonitorService.errors('LAST_24_HOURS');
    expect(rows.map((r) => [r.id, r.count])).toEqual([['g1', 7], ['g2', 1]]);
    expect(rows[0]).toMatchObject({
      operation_id: 'op1', operation_name: 'GetMe', code: 'INTERNAL', path: 'me', message: 'boom',
      first_seen_at: new Date(hourNow - HOUR + 500).toISOString(), last_seen_at: new Date(hourNow + 2000).toISOString(),
    });
    expect(rows[1]).toMatchObject({ operation_id: 'ghost', operation_name: 'ghost' });
  });

  it('is empty when there were no errors in the range', async () => {
    await group({ bucket_start: new Date(hourNow - 5 * HOUR) });
    await expect(graphqlMonitorService.errors('LAST_HOUR')).resolves.toEqual([]);
  });
});
