import { createHash } from 'node:crypto';
import { addToHistogram, type Histogram } from './graphqlMonitor.histogram';
import { ALL_OPERATIONS_KEY } from './graphqlMonitor.model';
import type { OperationShape } from './graphqlMonitor.signature';

/**
 * The in-memory half of the monitor: everything since the last flush.
 *
 * Deliberately free of Mongoose — the plugin calls `record` on the hot path and
 * the flusher `drain`s it once a minute. Every map is capped, so an attacker
 * minting a new operation per request grows the "all operations" totals and
 * nothing else.
 */

export interface ResolverTiming {
  path: string;
  parent_type: string;
  field_name: string;
  return_type: string;
  start_ms: number;
  duration_ms: number;
  error: string | null;
}

export interface RequestError {
  code: string;
  message: string;
  path: string;
}

export interface RequestSample {
  shape: OperationShape;
  client: string;
  at: number;
  duration_ms: number;
  parse_ms: number;
  validate_ms: number;
  /** Null when the request never executed: refused, invalid, or answered from cache. */
  execute_ms: number | null;
  cached: boolean;
  errors: RequestError[];
  /** Null unless this request was picked for resolver timing. */
  resolvers: ResolverTiming[] | null;
  resolver_count: number;
}

export interface OpAgg {
  op_key: string;
  minute: number;
  requests: number;
  errors: number;
  cached: number;
  executed: number;
  duration_total_ms: number;
  duration_max_ms: number;
  parse_total_ms: number;
  validate_total_ms: number;
  execute_total_ms: number;
  hist: Histogram;
  clients: Record<string, number>;
  error_codes: Record<string, number>;
  last_seen_at: number;
}

export interface FieldAgg {
  coordinate: string;
  hour: number;
  referenced: number;
  sampled_calls: number;
  sampled_errors: number;
  duration_total_ms: number;
  duration_max_ms: number;
  last_seen_at: number;
}

export interface ErrorAgg extends RequestError {
  group_key: string;
  hour: number;
  op_key: string;
  count: number;
  first_seen_at: number;
  last_seen_at: number;
}

export interface TraceAgg {
  op_key: string;
  hour: number;
  at: number;
  duration_ms: number;
  parse_ms: number;
  validate_ms: number;
  execute_ms: number;
  client: string;
  error_messages: string[];
  resolver_count: number;
  resolvers: ResolverTiming[];
}

export interface Snapshot {
  ops: OpAgg[];
  shapes: Array<OperationShape & { last_seen_at: number }>;
  fields: FieldAgg[];
  errors: ErrorAgg[];
  traces: TraceAgg[];
}

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const MAX_OPERATIONS = 5_000;
const MAX_FIELDS = 20_000;
const MAX_ERROR_GROUPS = 2_000;
const MAX_MESSAGE_CHARS = 500;

export const floorTo = (at: number, step: number): number => Math.floor(at / step) * step;

/** A Mongo map key: no dots, no leading dollar, bounded. */
export const safeKey = (raw: string): string => raw.replaceAll(/[^\w:-]/g, '_').slice(0, 60) || '_';

let ops = new Map<string, OpAgg>();
let shapes = new Map<string, OperationShape & { last_seen_at: number }>();
let fields = new Map<string, FieldAgg>();
let errors = new Map<string, ErrorAgg>();
let traces = new Map<string, TraceAgg>();

function opAgg(opKey: string, minute: number): OpAgg | null {
  const key = `${minute}|${opKey}`;
  const known = ops.get(key);
  if (known) return known;
  if (opKey !== ALL_OPERATIONS_KEY && ops.size >= MAX_OPERATIONS) return null;
  const created: OpAgg = {
    op_key: opKey,
    minute,
    requests: 0,
    errors: 0,
    cached: 0,
    executed: 0,
    duration_total_ms: 0,
    duration_max_ms: 0,
    parse_total_ms: 0,
    validate_total_ms: 0,
    execute_total_ms: 0,
    hist: {},
    clients: {},
    error_codes: {},
    last_seen_at: 0,
  };
  ops.set(key, created);
  return created;
}

function addToOp(agg: OpAgg, sample: RequestSample): void {
  agg.requests += 1;
  if (sample.errors.length > 0) agg.errors += 1;
  if (sample.cached) agg.cached += 1;
  agg.duration_total_ms += sample.duration_ms;
  agg.duration_max_ms = Math.max(agg.duration_max_ms, sample.duration_ms);
  agg.parse_total_ms += sample.parse_ms;
  agg.validate_total_ms += sample.validate_ms;
  if (sample.execute_ms !== null) {
    agg.executed += 1;
    agg.execute_total_ms += sample.execute_ms;
  }
  addToHistogram(agg.hist, sample.duration_ms);
  const client = safeKey(sample.client);
  agg.clients[client] = (agg.clients[client] ?? 0) + 1;
  for (const { code } of sample.errors) {
    const key = safeKey(code);
    agg.error_codes[key] = (agg.error_codes[key] ?? 0) + 1;
  }
  agg.last_seen_at = Math.max(agg.last_seen_at, sample.at);
}

function fieldAgg(coordinate: string, hour: number): FieldAgg | null {
  const key = `${hour}|${coordinate}`;
  const known = fields.get(key);
  if (known) return known;
  if (fields.size >= MAX_FIELDS) return null;
  const created: FieldAgg = {
    coordinate,
    hour,
    referenced: 0,
    sampled_calls: 0,
    sampled_errors: 0,
    duration_total_ms: 0,
    duration_max_ms: 0,
    last_seen_at: 0,
  };
  fields.set(key, created);
  return created;
}

function addFields(sample: RequestSample, hour: number): void {
  for (const coordinate of sample.shape.fields) {
    const agg = fieldAgg(coordinate, hour);
    if (!agg) continue;
    agg.referenced += 1;
    agg.last_seen_at = sample.at;
  }
  for (const timing of sample.resolvers ?? []) {
    const agg = fieldAgg(`${timing.parent_type}.${timing.field_name}`, hour);
    if (!agg) continue;
    agg.sampled_calls += 1;
    if (timing.error) agg.sampled_errors += 1;
    agg.duration_total_ms += timing.duration_ms;
    agg.duration_max_ms = Math.max(agg.duration_max_ms, timing.duration_ms);
  }
}

/** Ids and numbers vary per request; the fault behind them does not. */
const normaliseMessage = (message: string): string =>
  message.replaceAll(/[\da-f]{24}/gi, '<id>').replaceAll(/\d+/g, '#').slice(0, MAX_MESSAGE_CHARS);

function addErrors(sample: RequestSample, hour: number): void {
  for (const error of sample.errors) {
    const path = error.path.replaceAll(/\.\d+(?=\.|$)/g, '.[]');
    const groupKey = createHash('sha1')
      .update([sample.shape.op_key, error.code, path, normaliseMessage(error.message)].join('|'))
      .digest('hex');
    const key = `${hour}|${groupKey}`;
    const known = errors.get(key);
    if (known) {
      known.count += 1;
      known.last_seen_at = sample.at;
      continue;
    }
    if (errors.size >= MAX_ERROR_GROUPS) continue;
    errors.set(key, {
      group_key: groupKey,
      hour,
      op_key: sample.shape.op_key,
      code: error.code,
      path,
      message: error.message.slice(0, MAX_MESSAGE_CHARS),
      count: 1,
      first_seen_at: sample.at,
      last_seen_at: sample.at,
    });
  }
}

function keepSlowestTrace(sample: RequestSample, hour: number): void {
  if (!sample.resolvers) return;
  const known = traces.get(sample.shape.op_key);
  if (known && known.duration_ms >= sample.duration_ms) return;
  traces.set(sample.shape.op_key, {
    op_key: sample.shape.op_key,
    hour,
    at: sample.at,
    duration_ms: sample.duration_ms,
    parse_ms: sample.parse_ms,
    validate_ms: sample.validate_ms,
    execute_ms: sample.execute_ms ?? 0,
    client: sample.client,
    error_messages: sample.errors.slice(0, 10).map((e) => e.message.slice(0, MAX_MESSAGE_CHARS)),
    resolver_count: sample.resolver_count,
    resolvers: sample.resolvers,
  });
}

export function record(sample: RequestSample): void {
  const minute = floorTo(sample.at, MINUTE_MS);
  const hour = floorTo(sample.at, HOUR_MS);
  const all = opAgg(ALL_OPERATIONS_KEY, minute);
  if (all) addToOp(all, sample);
  const op = opAgg(sample.shape.op_key, minute);
  if (!op) return;
  addToOp(op, sample);
  shapes.set(sample.shape.op_key, { ...sample.shape, last_seen_at: sample.at });
  addFields(sample, hour);
  addErrors(sample, hour);
  keepSlowestTrace(sample, hour);
}

/** Hand everything counted so far to the flusher and start again. */
export function drain(): Snapshot {
  const snapshot: Snapshot = {
    ops: [...ops.values()],
    shapes: [...shapes.values()],
    fields: [...fields.values()],
    errors: [...errors.values()],
    traces: [...traces.values()],
  };
  ops = new Map();
  shapes = new Map();
  fields = new Map();
  errors = new Map();
  traces = new Map();
  return snapshot;
}
