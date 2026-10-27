import { flushGraphqlMonitor, startGraphqlMonitorFlusher } from '../../graphqlMonitor.flusher';
import { drain } from '../../graphqlMonitor.collector';
import {
  GraphqlErrorStatModel,
  GraphqlFieldStatModel,
  GraphqlOperationModel,
  GraphqlOperationStatModel,
  GraphqlTraceModel,
  MINUTE_RETENTION_MS,
} from '../../graphqlMonitor.model';
import { refreshRuntime, runtime } from '../../graphqlMonitor.settings';
import { logs } from '@observability/log';

jest.mock('../../graphqlMonitor.collector', () => ({ ...jest.requireActual('../../graphqlMonitor.collector'), drain: jest.fn() }));
jest.mock('../../graphqlMonitor.model', () => {
  const collection = () => ({ collection: { bulkWrite: jest.fn().mockResolvedValue({}) } });
  return {
    ...jest.requireActual('../../graphqlMonitor.model'),
    GraphqlErrorStatModel: collection(),
    GraphqlFieldStatModel: collection(),
    GraphqlOperationModel: collection(),
    GraphqlOperationStatModel: collection(),
    GraphqlTraceModel: collection(),
  };
});
jest.mock('../../graphqlMonitor.settings', () => ({ refreshRuntime: jest.fn(), runtime: { retention_days: 14 } }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));

const HOUR = 3_600_000;
const DAY = 86_400_000;
const bulk = (model: unknown) => (model as { collection: { bulkWrite: jest.Mock } }).collection.bulkWrite;

const T = Date.parse('2026-03-01T10:07:00Z');
const hour = Math.floor(T / HOUR) * HOUR;
const op = {
  op_key: 'op1', minute: T, requests: 4, errors: 1, cached: 2, executed: 2, duration_total_ms: 400, duration_max_ms: 150,
  parse_total_ms: 4, validate_total_ms: 8, execute_total_ms: 300, hist: { '100': 3, '200': 1 }, clients: { web: 3 }, error_codes: { E1: 1 }, last_seen_at: T,
};
const snapshot = (over: Record<string, unknown> = {}) => ({
  ops: [op],
  shapes: [{ op_key: 'op1', name: 'Q', type: 'QUERY', signature: 'q', root_fields: ['me'], fields: ['Query.me'], last_seen_at: T }],
  fields: [],
  errors: [],
  traces: [],
  ...over,
});

beforeEach(() => {
  runtime.retention_days = 14;
  (drain as jest.Mock).mockReturnValue(snapshot());
});

describe('flushGraphqlMonitor', () => {
  it('writes nothing when nothing was counted', async () => {
    (drain as jest.Mock).mockReturnValue(snapshot({ ops: [] }));
    await flushGraphqlMonitor();
    expect(bulk(GraphqlOperationStatModel)).not.toHaveBeenCalled();
    expect(bulk(GraphqlOperationModel)).not.toHaveBeenCalled();
  });

  it('adds a minute row and an hour row per operation with $inc upserts and the right expiry', async () => {
    await flushGraphqlMonitor();
    const [writes, options] = bulk(GraphqlOperationStatModel).mock.calls[0];
    expect(options).toEqual({ ordered: false });
    expect(writes).toHaveLength(2);
    const [minute, hr] = writes.map((w: any) => w.updateOne);
    expect(minute.filter).toEqual({ granularity: 'MINUTE', op_key: 'op1', bucket_start: new Date(T) });
    expect(minute.update.$set.expires_at).toEqual(new Date(T + MINUTE_RETENTION_MS));
    expect(hr.filter).toEqual({ granularity: 'HOUR', op_key: 'op1', bucket_start: new Date(hour) });
    expect(hr.update.$set.expires_at).toEqual(new Date(hour + 14 * DAY));
    expect(minute.upsert).toBe(true);
    expect(minute.update.$inc).toMatchObject({
      requests: 4, errors: 1, cached: 2, executed: 2, duration_total_ms: 400, 'hist.100': 3, 'hist.200': 1, 'clients.web': 3, 'error_codes.E1': 1,
    });
    expect(minute.update.$max).toEqual({ duration_max_ms: 150, last_seen_at: new Date(T) });
  });

  it('keeps each operation shape on first sight only, remembering when it was last seen', async () => {
    await flushGraphqlMonitor();
    const [writes] = bulk(GraphqlOperationModel).mock.calls[0];
    const update = writes[0].updateOne;
    expect(update.filter).toEqual({ op_key: 'op1' });
    expect(update.update.$setOnInsert).toEqual({ name: 'Q', type: 'QUERY', signature: 'q', root_fields: ['me'], fields: ['Query.me'], first_seen_at: new Date(T) });
    expect(update.update.$max).toEqual({ last_seen_at: new Date(T) });
    expect(update.update.$set.expires_at).toEqual(new Date(T + 14 * DAY));
  });

  it('skips the field, error and trace collections when they have nothing', async () => {
    await flushGraphqlMonitor();
    expect(bulk(GraphqlFieldStatModel)).not.toHaveBeenCalled();
    expect(bulk(GraphqlErrorStatModel)).not.toHaveBeenCalled();
    expect(bulk(GraphqlTraceModel)).not.toHaveBeenCalled();
  });

  it('writes field, error and trace rollups keyed by what and when', async () => {
    (drain as jest.Mock).mockReturnValue(
      snapshot({
        fields: [{ coordinate: 'Query.me', hour, referenced: 5, sampled_calls: 2, sampled_errors: 1, duration_total_ms: 30, duration_max_ms: 20, last_seen_at: T }],
        errors: [{ group_key: 'g1', hour, op_key: 'op1', count: 3, first_seen_at: T - 1000, last_seen_at: T, code: 'E1', path: 'me', message: 'boom' }],
        traces: [{ op_key: 'op1', hour, at: T, duration_ms: 900, parse_ms: 1, validate_ms: 2, execute_ms: 800, client: 'web', error_messages: [], resolver_count: 0, resolvers: [] }],
      })
    );
    await flushGraphqlMonitor();
    const field = bulk(GraphqlFieldStatModel).mock.calls[0][0][0].updateOne;
    expect(field.filter).toEqual({ coordinate: 'Query.me', bucket_start: new Date(hour) });
    expect(field.update.$inc).toEqual({ referenced: 5, sampled_calls: 2, sampled_errors: 1, duration_total_ms: 30 });
    expect(field.update.$set.expires_at).toEqual(new Date(hour + 14 * DAY));

    const error = bulk(GraphqlErrorStatModel).mock.calls[0][0][0].updateOne;
    expect(error.filter).toEqual({ group_key: 'g1', bucket_start: new Date(hour) });
    expect(error.update).toMatchObject({
      $inc: { count: 3 }, $min: { first_seen_at: new Date(T - 1000) }, $max: { last_seen_at: new Date(T) },
      $setOnInsert: { op_key: 'op1', code: 'E1', path: 'me', message: 'boom' },
    });

    const trace = bulk(GraphqlTraceModel).mock.calls[0][0][0].updateOne;
    expect(trace.filter).toEqual({ op_key: 'op1', bucket_start: new Date(hour), duration_ms: { $lt: 900 } });
    expect(trace.update.$set).toMatchObject({ client: 'web', at: new Date(T), duration_ms: 900 });
    expect(trace.update.$set.hour).toBeUndefined();
    expect(trace.update.$set.expires_at).toEqual(new Date(hour + 14 * DAY));
  });

  it('honours the configured retention', async () => {
    runtime.retention_days = 3;
    await flushGraphqlMonitor();
    const hr = bulk(GraphqlOperationStatModel).mock.calls[0][0][1].updateOne;
    expect(hr.update.$set.expires_at).toEqual(new Date(hour + 3 * DAY));
  });

  it('logs a failed collection write and still writes the others', async () => {
    bulk(GraphqlOperationStatModel).mockRejectedValueOnce(new Error('mongo down'));
    await flushGraphqlMonitor();
    expect(logs.server.error).toHaveBeenCalledWith('graphqlMonitor', 'flush', { error: expect.any(Error), collection: 'operation stats' });
    expect(bulk(GraphqlOperationModel)).toHaveBeenCalledTimes(1);
  });

  it('treats a duplicate-key refusal from the trace write as "keep the slower stored trace"', async () => {
    (drain as jest.Mock).mockReturnValue(
      snapshot({ traces: [{ op_key: 'op1', hour, at: T, duration_ms: 10, parse_ms: 0, validate_ms: 0, execute_ms: 0, client: 'web', error_messages: [], resolver_count: 0, resolvers: [] }] })
    );
    bulk(GraphqlTraceModel).mockRejectedValueOnce({ writeErrors: [{ code: 11000 }, { code: 11000 }] });
    await flushGraphqlMonitor();
    expect(logs.server.error).not.toHaveBeenCalled();
  });

  it('still logs a trace write that failed for any other reason', async () => {
    (drain as jest.Mock).mockReturnValue(
      snapshot({ traces: [{ op_key: 'op1', hour, at: T, duration_ms: 10, parse_ms: 0, validate_ms: 0, execute_ms: 0, client: 'web', error_messages: [], resolver_count: 0, resolvers: [] }] })
    );
    bulk(GraphqlTraceModel).mockRejectedValueOnce({ writeErrors: [{ code: 11000 }, { code: 121 }] });
    await flushGraphqlMonitor();
    expect(logs.server.error).toHaveBeenCalledWith('graphqlMonitor', 'flush', expect.objectContaining({ collection: 'traces' }));
    bulk(GraphqlTraceModel).mockRejectedValueOnce(new Error('plain'));
    await flushGraphqlMonitor();
    expect(logs.server.error).toHaveBeenCalledTimes(2);
  });

  it('does not swallow a failed operation-stat write as a duplicate', async () => {
    bulk(GraphqlOperationStatModel).mockRejectedValueOnce({ writeErrors: [{ code: 11000 }] });
    await flushGraphqlMonitor();
    expect(logs.server.error).toHaveBeenCalledWith('graphqlMonitor', 'flush', expect.objectContaining({ collection: 'operation stats' }));
  });
});

describe('startGraphqlMonitorFlusher', () => {
  const realEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = realEnv;
    jest.useRealTimers();
  });

  it('does nothing under NODE_ENV=test', () => {
    const stop = startGraphqlMonitorFlusher();
    expect(refreshRuntime).not.toHaveBeenCalled();
    expect(stop()).toBeUndefined();
  });

  describe('in a running server', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      jest.useFakeTimers();
      (refreshRuntime as jest.Mock).mockResolvedValue(undefined);
    });

    it('loads the settings at once, then flushes and refreshes every minute until stopped', async () => {
      const stop = startGraphqlMonitorFlusher();
      expect(refreshRuntime).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(60_000);
      expect(drain).toHaveBeenCalledTimes(1);
      expect(refreshRuntime).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(60_000);
      expect(drain).toHaveBeenCalledTimes(2);
      stop();
      await jest.advanceTimersByTimeAsync(180_000);
      expect(drain).toHaveBeenCalledTimes(2);
    });

    it('does not stack flushes while one is still running', async () => {
      let release: () => void = () => undefined;
      (refreshRuntime as jest.Mock).mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));
      const stop = startGraphqlMonitorFlusher();
      await jest.advanceTimersByTimeAsync(60_000);
      expect(drain).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(60_000);
      expect(drain).toHaveBeenCalledTimes(1);
      release();
      await jest.advanceTimersByTimeAsync(0);
      await jest.advanceTimersByTimeAsync(60_000);
      expect(drain).toHaveBeenCalledTimes(2);
      stop();
    });

    it('logs a failing settings load and a failing tick, and carries on', async () => {
      (refreshRuntime as jest.Mock).mockRejectedValue(new Error('settings down'));
      const stop = startGraphqlMonitorFlusher();
      await jest.advanceTimersByTimeAsync(0);
      expect(logs.server.error).toHaveBeenCalledWith('graphqlMonitor', 'settings', { error: expect.any(Error) });
      await jest.advanceTimersByTimeAsync(60_000);
      expect(logs.server.error).toHaveBeenCalledWith('graphqlMonitor', 'tick', { error: expect.any(Error) });
      await jest.advanceTimersByTimeAsync(60_000);
      expect(drain).toHaveBeenCalledTimes(2);
      stop();
    });
  });
});
