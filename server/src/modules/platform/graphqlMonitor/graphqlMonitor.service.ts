import { GraphQLError, isInterfaceType, isObjectType, type GraphQLField, type GraphQLSchema } from 'graphql';
import { distribution, round1 } from './graphqlMonitor.histogram';
import {
  ALL_OPERATIONS_KEY,
  GraphqlErrorStatModel,
  GraphqlFieldStatModel,
  GraphqlOperationModel,
  GraphqlOperationStatModel,
  GraphqlTraceModel,
} from './graphqlMonitor.model';
import { currentSchema } from './graphqlMonitor.plugin';
import {
  EMPTY_COUNTS,
  countsBy,
  histogramsBy,
  resolveRange,
  series,
  statMatch,
  summarize,
  tally,
  type ResolvedRange,
} from './graphqlMonitor.query';
import { readSettings, updateSettings } from './graphqlMonitor.settings';

/**
 * Tech > GraphQL Monitor: everything the console reads.
 *
 * Operations and the overview come from the minute/hour rollups; Fields and
 * Errors from their hourly rollups; the field LIST from the live schema, so a
 * field nobody has called in the whole retention still shows — at zero, which
 * is the answer the Fields page exists to give.
 */

const HOUR_MS = 3_600_000;
const MAX_TRACES = 25;
const MAX_ERROR_GROUPS = 1_000;

const iso = (date: Date | null | undefined) => (date ? date.toISOString() : null);

/** Field rollups are hourly, so a short range reads from the top of its first hour. */
const hourFloor = (range: ResolvedRange) => new Date(Math.floor(range.from.getTime() / HOUR_MS) * HOUR_MS);

async function registryByKey(keys: string[]) {
  const docs = await GraphqlOperationModel.find({ op_key: { $in: keys } }, { signature: 0, fields: 0 }).lean();
  return new Map(docs.map((doc) => [doc.op_key, doc]));
}

async function operations(rangeName?: string | null) {
  const range = resolveRange(rangeName);
  const match = statMatch(range, { $ne: ALL_OPERATIONS_KEY });
  const [counts, histograms] = await Promise.all([countsBy(match, '$op_key'), histogramsBy(match, '$op_key')]);
  const registry = await registryByKey([...counts.keys()]);
  return [...counts.entries()].map(([opKey, c]) => {
    const known = registry.get(opKey);
    return {
      id: opKey,
      name: known?.name ?? opKey,
      type: known?.type ?? 'UNKNOWN',
      root_fields: known?.root_fields ?? [],
      ...summarize(c, histograms.get(opKey) ?? {}, range.minutes),
    };
  });
}

async function overview(rangeName?: string | null) {
  const range = resolveRange(rangeName);
  const match = statMatch(range, ALL_OPERATIONS_KEY);
  const [counts, histograms, points, clients, errorCodes, keys] = await Promise.all([
    countsBy(match, null),
    histogramsBy(match, null),
    series(range, ALL_OPERATIONS_KEY),
    tally(match, 'clients'),
    tally(match, 'error_codes'),
    GraphqlOperationStatModel.distinct('op_key', statMatch(range, { $ne: ALL_OPERATIONS_KEY })),
  ]);
  return {
    ...summarize(counts.get('null') ?? EMPTY_COUNTS, histograms.get('null') ?? {}, range.minutes),
    operation_count: keys.length,
    series: points,
    clients,
    error_codes: errorCodes,
  };
}

async function operation(opKey: string, rangeName?: string | null) {
  const range = resolveRange(rangeName);
  const known = await GraphqlOperationModel.findOne({ op_key: opKey }).lean();
  if (!known) throw new GraphQLError('Operation not found', { extensions: { code: 'NOT_FOUND' } });
  const match = statMatch(range, opKey);
  const [counts, histograms, points, clients, errorCodes] = await Promise.all([
    countsBy(match, null),
    histogramsBy(match, null),
    series(range, opKey),
    tally(match, 'clients'),
    tally(match, 'error_codes'),
  ]);
  const histogram = histograms.get('null') ?? {};
  return {
    id: known.op_key,
    name: known.name,
    type: known.type,
    signature: known.signature,
    root_fields: known.root_fields,
    fields: known.fields,
    first_seen_at: iso(known.first_seen_at),
    ...summarize(counts.get('null') ?? EMPTY_COUNTS, histogram, range.minutes),
    series: points,
    latency_distribution: distribution(histogram),
    clients,
    error_codes: errorCodes,
  };
}

async function traces(opKey: string) {
  const docs = await GraphqlTraceModel.find({ op_key: opKey }, { resolvers: 0 })
    .sort({ duration_ms: -1 })
    .limit(MAX_TRACES)
    .lean();
  return docs.map(({ _id, at, ...rest }) => ({ ...rest, id: String(_id), at: iso(at) }));
}

async function trace(id: string) {
  const doc = await GraphqlTraceModel.findById(id).lean().catch(() => null);
  if (!doc) throw new GraphQLError('Trace not found', { extensions: { code: 'NOT_FOUND' } });
  const { _id, at, ...rest } = doc;
  return { ...rest, id: String(_id), at: iso(at) };
}

function rootKind(schema: GraphQLSchema, typeName: string): string {
  if (schema.getQueryType()?.name === typeName) return 'QUERY';
  if (schema.getMutationType()?.name === typeName) return 'MUTATION';
  if (schema.getSubscriptionType()?.name === typeName) return 'SUBSCRIPTION';
  return 'TYPE';
}

function schemaFields(schema: GraphQLSchema) {
  const rows: Array<{ parent_type: string; kind: string; field: GraphQLField<unknown, unknown> }> = [];
  for (const type of Object.values(schema.getTypeMap())) {
    if (type.name.startsWith('__') || !(isObjectType(type) || isInterfaceType(type))) continue;
    const kind = rootKind(schema, type.name);
    for (const field of Object.values(type.getFields())) rows.push({ parent_type: type.name, kind, field });
  }
  return rows;
}

async function fields(rangeName?: string | null) {
  const schema = currentSchema();
  if (!schema) return [];
  const range = resolveRange(rangeName);
  const usage = await GraphqlFieldStatModel.aggregate<Record<string, number> & { _id: string; last_seen_at: Date }>([
    { $match: { bucket_start: { $gte: hourFloor(range) } } },
    {
      $group: {
        _id: '$coordinate',
        referenced: { $sum: '$referenced' },
        sampled_calls: { $sum: '$sampled_calls' },
        sampled_errors: { $sum: '$sampled_errors' },
        duration_total_ms: { $sum: '$duration_total_ms' },
        duration_max_ms: { $max: '$duration_max_ms' },
        last_seen_at: { $max: '$last_seen_at' },
      },
    },
  ]);
  const byCoordinate = new Map(usage.map((row) => [row._id, row]));
  return schemaFields(schema).map(({ parent_type: parentType, kind, field }) => {
    const coordinate = `${parentType}.${field.name}`;
    const used = byCoordinate.get(coordinate);
    const calls = used?.sampled_calls ?? 0;
    return {
      coordinate,
      parent_type: parentType,
      field_name: field.name,
      kind,
      return_type: String(field.type),
      arguments: field.args.map((arg) => `${arg.name}: ${String(arg.type)}`),
      description: field.description ?? '',
      deprecation_reason: field.deprecationReason ?? null,
      referenced: used?.referenced ?? 0,
      sampled_calls: calls,
      error_rate_pct: calls > 0 ? round1(((used?.sampled_errors ?? 0) / calls) * 100) : 0,
      avg_ms: calls > 0 ? round1((used?.duration_total_ms ?? 0) / calls) : 0,
      max_ms: round1(used?.duration_max_ms ?? 0),
      last_seen_at: iso(used?.last_seen_at),
    };
  });
}

async function errors(rangeName?: string | null) {
  const range = resolveRange(rangeName);
  const rows = await GraphqlErrorStatModel.aggregate<{
    _id: string;
    op_key: string;
    code: string;
    path: string;
    message: string;
    count: number;
    first_seen_at: Date;
    last_seen_at: Date;
  }>([
    { $match: { bucket_start: { $gte: hourFloor(range) } } },
    {
      $group: {
        _id: '$group_key',
        op_key: { $first: '$op_key' },
        code: { $first: '$code' },
        path: { $first: '$path' },
        message: { $first: '$message' },
        count: { $sum: '$count' },
        first_seen_at: { $min: '$first_seen_at' },
        last_seen_at: { $max: '$last_seen_at' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: MAX_ERROR_GROUPS },
  ]);
  const registry = await registryByKey([...new Set(rows.map((row) => row.op_key))]);
  return rows.map(({ _id, first_seen_at: first, last_seen_at: last, ...row }) => ({
    ...row,
    id: _id,
    operation_id: row.op_key,
    operation_name: registry.get(row.op_key)?.name ?? row.op_key,
    first_seen_at: iso(first),
    last_seen_at: iso(last),
  }));
}

export const graphqlMonitorService = {
  overview,
  operations,
  operation,
  traces,
  trace,
  fields,
  errors,
  settings: readSettings,
  updateSettings,
};
