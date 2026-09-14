import type { mongo } from 'mongoose';
import { logs } from '@observability/log';
import { drain, floorTo, type ErrorAgg, type FieldAgg, type OpAgg, type Snapshot, type TraceAgg } from './graphqlMonitor.collector';
import {
  GraphqlErrorStatModel,
  GraphqlFieldStatModel,
  GraphqlOperationModel,
  GraphqlOperationStatModel,
  GraphqlTraceModel,
  MINUTE_RETENTION_MS,
  type StatGranularity,
} from './graphqlMonitor.model';
import { refreshRuntime, runtime } from './graphqlMonitor.settings';

/**
 * Once a minute: fold what the collector counted into the rollups.
 *
 * Every write is an `$inc` upsert keyed on (what, bucket), so two flushes that
 * land in the same hour add up rather than overwrite, and a crash between them
 * loses at most the minute that was still in memory.
 */

type BulkWrite = mongo.AnyBulkWriteOperation<mongo.Document>;

const FLUSH_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const DUPLICATE_KEY = 11_000;

const retainUntil = (bucketStart: number): Date => new Date(bucketStart + runtime.retention_days * DAY_MS);

function hashInc(prefix: string, map: Record<string, number>): Record<string, number> {
  const inc: Record<string, number> = {};
  for (const [key, count] of Object.entries(map)) inc[`${prefix}.${key}`] = count;
  return inc;
}

function opStatWrite(agg: OpAgg, granularity: StatGranularity): BulkWrite {
  const bucketStart = granularity === 'MINUTE' ? agg.minute : floorTo(agg.minute, HOUR_MS);
  const expiresAt = granularity === 'MINUTE' ? new Date(bucketStart + MINUTE_RETENTION_MS) : retainUntil(bucketStart);
  return {
    updateOne: {
      filter: { granularity, op_key: agg.op_key, bucket_start: new Date(bucketStart) },
      update: {
        $inc: {
          requests: agg.requests,
          errors: agg.errors,
          cached: agg.cached,
          executed: agg.executed,
          duration_total_ms: agg.duration_total_ms,
          parse_total_ms: agg.parse_total_ms,
          validate_total_ms: agg.validate_total_ms,
          execute_total_ms: agg.execute_total_ms,
          ...hashInc('hist', agg.hist),
          ...hashInc('clients', agg.clients),
          ...hashInc('error_codes', agg.error_codes),
        },
        $max: { duration_max_ms: agg.duration_max_ms, last_seen_at: new Date(agg.last_seen_at) },
        $set: { expires_at: expiresAt },
      },
      upsert: true,
    },
  };
}

function fieldWrite(agg: FieldAgg): BulkWrite {
  return {
    updateOne: {
      filter: { coordinate: agg.coordinate, bucket_start: new Date(agg.hour) },
      update: {
        $inc: {
          referenced: agg.referenced,
          sampled_calls: agg.sampled_calls,
          sampled_errors: agg.sampled_errors,
          duration_total_ms: agg.duration_total_ms,
        },
        $max: { duration_max_ms: agg.duration_max_ms, last_seen_at: new Date(agg.last_seen_at) },
        $set: { expires_at: retainUntil(agg.hour) },
      },
      upsert: true,
    },
  };
}

function errorWrite(agg: ErrorAgg): BulkWrite {
  return {
    updateOne: {
      filter: { group_key: agg.group_key, bucket_start: new Date(agg.hour) },
      update: {
        $inc: { count: agg.count },
        $min: { first_seen_at: new Date(agg.first_seen_at) },
        $max: { last_seen_at: new Date(agg.last_seen_at) },
        $set: { expires_at: retainUntil(agg.hour) },
        $setOnInsert: { op_key: agg.op_key, code: agg.code, path: agg.path, message: agg.message },
      },
      upsert: true,
    },
  };
}

/**
 * Replaces the hour's trace only when this one is slower. When the stored one
 * is slower the filter misses, the upsert collides with it on the unique index,
 * and that duplicate-key refusal is exactly the "keep the old one" answer.
 */
function traceWrite(agg: TraceAgg): BulkWrite {
  const { hour, at, ...rest } = agg;
  return {
    updateOne: {
      filter: { op_key: agg.op_key, bucket_start: new Date(hour), duration_ms: { $lt: agg.duration_ms } },
      update: { $set: { ...rest, at: new Date(at), expires_at: retainUntil(hour) } },
      upsert: true,
    },
  };
}

function registryWrite(shape: Snapshot['shapes'][number]): BulkWrite {
  const { last_seen_at: lastSeen, op_key: opKey, ...rest } = shape;
  const seen = new Date(lastSeen);
  return {
    updateOne: {
      filter: { op_key: opKey },
      update: {
        $setOnInsert: { ...rest, first_seen_at: seen },
        $max: { last_seen_at: seen },
        $set: { expires_at: retainUntil(lastSeen) },
      },
      upsert: true,
    },
  };
}

async function write(label: string, run: () => Promise<unknown>, ignoreDuplicates = false): Promise<void> {
  try {
    await run();
  } catch (err) {
    const writeErrors = (err as { writeErrors?: Array<{ code?: number }> }).writeErrors;
    if (ignoreDuplicates && writeErrors?.every((e) => e.code === DUPLICATE_KEY)) return;
    logs.server.error('graphqlMonitor', 'flush', { error: err, collection: label });
  }
}

const unordered = { ordered: false } as const;

/** Write everything counted since the last flush. Safe to call at any time. */
export async function flushGraphqlMonitor(): Promise<void> {
  const snapshot = drain();
  if (snapshot.ops.length === 0) return;
  const opWrites = snapshot.ops.flatMap((agg) => [opStatWrite(agg, 'MINUTE'), opStatWrite(agg, 'HOUR')]);
  await Promise.all([
    write('operation stats', () => GraphqlOperationStatModel.collection.bulkWrite(opWrites, unordered)),
    write('operations', () => GraphqlOperationModel.collection.bulkWrite(snapshot.shapes.map(registryWrite), unordered)),
    snapshot.fields.length > 0 &&
      write('field stats', () => GraphqlFieldStatModel.collection.bulkWrite(snapshot.fields.map(fieldWrite), unordered)),
    snapshot.errors.length > 0 &&
      write('error stats', () => GraphqlErrorStatModel.collection.bulkWrite(snapshot.errors.map(errorWrite), unordered)),
    snapshot.traces.length > 0 &&
      write('traces', () => GraphqlTraceModel.collection.bulkWrite(snapshot.traces.map(traceWrite), unordered), true),
  ]);
}

/** Start the one-minute flush. Returns a stop function. No-ops under NODE_ENV=test. */
export function startGraphqlMonitorFlusher(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  refreshRuntime().catch((err) => logs.server.error('graphqlMonitor', 'settings', { error: err }));
  let running = false;
  const interval = setInterval(() => {
    // One flush at a time: a slow database must not stack writes up.
    if (running) return;
    running = true;
    Promise.all([flushGraphqlMonitor(), refreshRuntime()])
      .catch((err) => logs.server.error('graphqlMonitor', 'tick', { error: err }))
      .finally(() => {
        running = false;
      });
  }, FLUSH_MS);
  interval.unref?.();
  return () => clearInterval(interval);
}
