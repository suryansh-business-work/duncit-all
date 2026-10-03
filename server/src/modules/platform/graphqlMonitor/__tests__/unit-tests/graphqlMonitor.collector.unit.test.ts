/**
 * The monitor's in-memory collector: what `record` folds into each rollup, and
 * how `drain` hands it over. Pure module state — no database.
 */
import { bucketIndex, bucketKey } from '../../graphqlMonitor.histogram';
import { ALL_OPERATIONS_KEY } from '../../graphqlMonitor.model';
import type { OperationShape } from '../../graphqlMonitor.signature';
import {
  drain,
  floorTo,
  record,
  safeKey,
  type RequestError,
  type RequestSample,
  type ResolverTiming,
} from '../../graphqlMonitor.collector';

const MINUTE = 60_000;
const HOUR = 3_600_000;
/** 2026-09-01T10:00:00Z — on a whole hour, so minute and hour floors are easy to read. */
const T0 = Date.parse('2026-09-01T10:00:00Z');

const shape = (overrides: Partial<OperationShape> = {}): OperationShape => ({
  op_key: 'op-home',
  name: 'Home',
  type: 'query',
  signature: 'query Home{pods{id}}',
  root_fields: ['pods'],
  fields: ['Query.pods', 'Pod.id'],
  ...overrides,
});

const sample = (overrides: Partial<RequestSample> = {}): RequestSample => ({
  shape: shape(),
  client: 'mweb',
  at: T0 + 5_000,
  duration_ms: 10,
  parse_ms: 1,
  validate_ms: 2,
  execute_ms: 7,
  cached: false,
  errors: [],
  resolvers: null,
  resolver_count: 0,
  ...overrides,
});

const timing = (overrides: Partial<ResolverTiming> = {}): ResolverTiming => ({
  path: 'pods.0.id',
  parent_type: 'Pod',
  field_name: 'id',
  return_type: 'ID!',
  start_ms: 0,
  duration_ms: 4,
  error: null,
  ...overrides,
});

const err = (overrides: Partial<RequestError> = {}): RequestError => ({
  code: 'NOT_FOUND',
  message: 'Pod not found',
  path: 'pod',
  ...overrides,
});

beforeEach(() => {
  drain();
});

describe('floorTo / safeKey', () => {
  it('floors a timestamp to the start of its step', () => {
    expect(floorTo(T0 + 59_999, MINUTE)).toBe(T0);
    expect(floorTo(T0 + MINUTE, MINUTE)).toBe(T0 + MINUTE);
    expect(floorTo(T0 + 59 * MINUTE, HOUR)).toBe(T0);
  });

  it('makes a key Mongo can store: no dots or dollars, bounded, never empty', () => {
    expect(safeKey('$client.v1 beta')).toBe('_client_v1_beta');
    expect(safeKey('ios:app-1_2')).toBe('ios:app-1_2');
    expect(safeKey('x'.repeat(80))).toHaveLength(60);
    expect(safeKey('')).toBe('_');
  });
});

describe('record → drain', () => {
  it('counts one request into both the operation and the all-operations rollup', () => {
    record(sample());
    const snap = drain();

    expect(snap.ops.map((o) => o.op_key).sort()).toEqual([ALL_OPERATIONS_KEY, 'op-home'].sort());
    for (const op of snap.ops) {
      expect(op).toEqual({
        op_key: op.op_key,
        minute: T0,
        requests: 1,
        errors: 0,
        cached: 0,
        executed: 1,
        duration_total_ms: 10,
        duration_max_ms: 10,
        parse_total_ms: 1,
        validate_total_ms: 2,
        execute_total_ms: 7,
        hist: { [bucketKey(bucketIndex(10))]: 1 },
        clients: { mweb: 1 },
        error_codes: {},
        last_seen_at: T0 + 5_000,
      });
    }
    expect(snap.shapes).toEqual([{ ...shape(), last_seen_at: T0 + 5_000 }]);
    expect(snap.fields).toEqual([
      { coordinate: 'Query.pods', hour: T0, referenced: 1, sampled_calls: 0, sampled_errors: 0, duration_total_ms: 0, duration_max_ms: 0, last_seen_at: T0 + 5_000 },
      { coordinate: 'Pod.id', hour: T0, referenced: 1, sampled_calls: 0, sampled_errors: 0, duration_total_ms: 0, duration_max_ms: 0, last_seen_at: T0 + 5_000 },
    ]);
    expect(snap.errors).toEqual([]);
    expect(snap.traces).toEqual([]);
  });

  it('counts a cached answer as cached and not executed', () => {
    record(sample({ cached: true, execute_ms: null }));
    const op = drain().ops.find((o) => o.op_key === 'op-home');
    expect(op).toMatchObject({ cached: 1, executed: 0, execute_total_ms: 0, requests: 1 });
  });

  it('adds requests in the same minute together and keeps the worst duration and latest sighting', () => {
    record(sample({ duration_ms: 30, at: T0 + 20_000, client: 'native.ios' }));
    record(sample({ duration_ms: 10, at: T0 + 10_000 }));
    const op = drain().ops.find((o) => o.op_key === 'op-home');
    expect(op).toMatchObject({
      requests: 2,
      duration_total_ms: 40,
      duration_max_ms: 30,
      last_seen_at: T0 + 20_000,
      clients: { native_ios: 1, mweb: 1 },
    });
  });

  it('keeps separate rollups per minute', () => {
    record(sample({ at: T0 + 1_000 }));
    record(sample({ at: T0 + MINUTE + 1_000 }));
    const minutes = drain()
      .ops.filter((o) => o.op_key === 'op-home')
      .map((o) => o.minute)
      .sort((a, b) => a - b);
    expect(minutes).toEqual([T0, T0 + MINUTE]);
  });

  it('starts afresh after a drain', () => {
    record(sample({ resolvers: [timing()], errors: [err()] }));
    expect(drain().ops).toHaveLength(2);
    expect(drain()).toEqual({ ops: [], shapes: [], fields: [], errors: [], traces: [] });
  });
});

describe('errors', () => {
  it('counts a failing request once and every error code it carried', () => {
    record(sample({ errors: [err({ code: 'NOT_FOUND' }), err({ code: 'NOT_FOUND', path: 'other' }), err({ code: 'BAD.INPUT' })] }));
    const op = drain().ops.find((o) => o.op_key === 'op-home');
    expect(op?.errors).toBe(1);
    expect(op?.error_codes).toEqual({ NOT_FOUND: 2, BAD_INPUT: 1 });
  });

  it('groups errors whose message differs only by ids and numbers, with list indexes collapsed', () => {
    record(sample({ at: T0 + 1_000, errors: [err({ message: 'Pod 64b7c0f2a1b2c3d4e5f60001 not found after 3 tries', path: 'pods.3.title' })] }));
    record(sample({ at: T0 + 2_000, errors: [err({ message: 'Pod 64b7c0f2a1b2c3d4e5f60002 not found after 12 tries', path: 'pods.7.title' })] }));
    const [group, ...rest] = drain().errors;
    expect(rest).toEqual([]);
    expect(group).toMatchObject({
      hour: T0,
      op_key: 'op-home',
      code: 'NOT_FOUND',
      path: 'pods.[].title',
      message: 'Pod 64b7c0f2a1b2c3d4e5f60001 not found after 3 tries',
      count: 2,
      first_seen_at: T0 + 1_000,
      last_seen_at: T0 + 2_000,
    });
    expect(group.group_key).toMatch(/^[\da-f]{40}$/);
  });

  it('keeps different faults, operations and hours in separate groups', () => {
    record(sample({ errors: [err({ message: 'Pod not found' })] }));
    record(sample({ errors: [err({ message: 'Club not found' })] }));
    record(sample({ shape: shape({ op_key: 'op-club' }), errors: [err({ message: 'Pod not found' })] }));
    record(sample({ at: T0 + HOUR, errors: [err({ message: 'Pod not found' })] }));
    expect(drain().errors).toHaveLength(4);
  });

  it('truncates a very long message to 500 characters', () => {
    record(sample({ errors: [err({ message: 'x'.repeat(800) })] }));
    expect(drain().errors[0].message).toHaveLength(500);
  });

  it('stops opening new groups past 2000 but still counts known ones', () => {
    const many = Array.from({ length: 2001 }, (_, i) => err({ code: `E_${'x'.repeat(i % 50)}`, path: `p${String.fromCodePoint(97 + (i % 26))}`, message: `m-${'y'.repeat(Math.floor(i / 50))}` }));
    record(sample({ errors: many }));
    expect(drain().errors).toHaveLength(2000);
  });
});

describe('resolver timings and traces', () => {
  it('folds sampled resolver timings into their field rollup', () => {
    record(
      sample({
        resolvers: [timing({ duration_ms: 4 }), timing({ duration_ms: 9, error: 'boom' }), timing({ parent_type: 'Query', field_name: 'pods', duration_ms: 6 })],
        resolver_count: 3,
      })
    );
    const fields = drain().fields;
    expect(fields.find((f) => f.coordinate === 'Pod.id')).toMatchObject({
      referenced: 1,
      sampled_calls: 2,
      sampled_errors: 1,
      duration_total_ms: 13,
      duration_max_ms: 9,
    });
    expect(fields.find((f) => f.coordinate === 'Query.pods')).toMatchObject({ sampled_calls: 1, duration_max_ms: 6 });
  });

  it('keeps only the slowest traced request per operation', () => {
    record(sample({ duration_ms: 100, resolvers: [timing()], resolver_count: 1, at: T0 + 1_000 }));
    record(sample({ duration_ms: 50, resolvers: [timing()], resolver_count: 1, at: T0 + 2_000 }));
    record(sample({ duration_ms: 100, resolvers: [timing()], resolver_count: 1, at: T0 + 3_000 }));
    let [trace] = drain().traces;
    expect(trace).toMatchObject({ duration_ms: 100, at: T0 + 1_000 });

    record(sample({ duration_ms: 100, resolvers: [timing()], resolver_count: 1, at: T0 + 1_000 }));
    record(sample({ duration_ms: 200, resolvers: [timing({ duration_ms: 150 })], resolver_count: 7, at: T0 + 4_000, client: 'admin' }));
    [trace] = drain().traces;
    expect(trace).toEqual({
      op_key: 'op-home',
      hour: T0,
      at: T0 + 4_000,
      duration_ms: 200,
      parse_ms: 1,
      validate_ms: 2,
      execute_ms: 7,
      client: 'admin',
      error_messages: [],
      resolver_count: 7,
      resolvers: [timing({ duration_ms: 150 })],
    });
  });

  it('records a never-executed trace as zero execute time with at most ten trimmed messages', () => {
    const errors = Array.from({ length: 12 }, (_, i) => err({ message: `${i}:${'z'.repeat(600)}` }));
    record(sample({ execute_ms: null, errors, resolvers: [], resolver_count: 0 }));
    const [trace] = drain().traces;
    expect(trace.execute_ms).toBe(0);
    expect(trace.error_messages).toHaveLength(10);
    expect(trace.error_messages[0]).toHaveLength(500);
    expect(trace.error_messages[0].startsWith('0:')).toBe(true);
  });

  it('does not trace a request that was not picked for resolver timing', () => {
    record(sample({ resolvers: null, duration_ms: 9_999 }));
    expect(drain().traces).toEqual([]);
  });
});

describe('caps', () => {
  it('stops tracking new operations past 5000 while the all-operations total keeps counting', () => {
    for (let i = 0; i < 5_000; i += 1) {
      record(sample({ shape: shape({ op_key: `op-${i}`, fields: [] }) }));
    }
    const snap = drain();
    // One rollup for "*" plus 4999 operations fill the 5000 slots.
    expect(snap.ops).toHaveLength(5_000);
    expect(snap.ops.find((o) => o.op_key === 'op-4999')).toBeUndefined();
    expect(snap.shapes.find((s) => s.op_key === 'op-4999')).toBeUndefined();
    expect(snap.ops.find((o) => o.op_key === ALL_OPERATIONS_KEY)?.requests).toBe(5_000);
  });

  it('opens the all-operations rollup for a new minute even when the map is full', () => {
    for (let i = 0; i < 5_000; i += 1) {
      record(sample({ shape: shape({ op_key: `op-${i}`, fields: [] }) }));
    }
    record(sample({ at: T0 + MINUTE, shape: shape({ op_key: 'op-late', fields: [] }) }));
    const snap = drain();
    expect(snap.ops.find((o) => o.op_key === ALL_OPERATIONS_KEY && o.minute === T0 + MINUTE)?.requests).toBe(1);
    expect(snap.ops.find((o) => o.op_key === 'op-late')).toBeUndefined();
  });

  it('stops tracking new fields past 20000, for selections and resolver timings alike', () => {
    const coordinates = Array.from({ length: 20_001 }, (_, i) => `Type.f${i}`);
    record(sample({ shape: shape({ fields: coordinates }), resolvers: [timing({ parent_type: 'Late', field_name: 'field' })], resolver_count: 1 }));
    const fields = drain().fields;
    expect(fields).toHaveLength(20_000);
    expect(fields.find((f) => f.coordinate === 'Type.f20000')).toBeUndefined();
    expect(fields.find((f) => f.coordinate === 'Late.field')).toBeUndefined();
  });
});
