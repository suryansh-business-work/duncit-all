import { GraphQLError } from 'graphql';
import { Types, type PipelineStage } from 'mongoose';
import type { AuthUser } from '@context';
import { getAppTimeZone } from '@utils/app-time';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { isMcpManager } from '../mcp.access';
import { McpToolCallModel, type IMcpToolCall } from './usage.model';

/**
 * The MCP console's dashboard and Activity table.
 *
 * An MCP manager sees everyone; everybody else sees only their own calls — the
 * scope is a filter built here, never a client-supplied one, so no argument can
 * widen it. Day buckets are cut in the admin-configured time zone, like every
 * other dashboard.
 */

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;
const TOP = 50;

const TOOL_CALL_TABLE: TableEntityConfig = {
  searchFields: ['tool', 'user_email', 'client_name', 'reason', 'error_message'],
  sortFields: {
    created_at: 'created_at',
    tool: 'tool',
    user_email: 'user_email',
    client_name: 'client_name',
    status: 'status',
    duration_ms: 'duration_ms',
    input_tokens: 'input_tokens',
    output_tokens: 'output_tokens',
    cost: 'cost',
  },
  filterFields: {
    tool: { type: 'string' },
    category: { type: 'string' },
    endpoint: { type: 'string' },
    client_name: { type: 'string' },
    user_email: { type: 'string' },
    status: { type: 'enum' },
    risk: { type: 'enum' },
    kind: { type: 'enum' },
    created_at: { type: 'date' },
    duration_ms: { type: 'number' },
  },
  defaultSort: { created_at: -1 },
};

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

function parseInstant(value: string | null | undefined, name: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fail('BAD_USER_INPUT', `${name} is not a valid date`) : date;
}

/** The window asked for, defaulting to the last 30 days and never longer than a year. */
export function rangeOf(from?: string | null, to?: string | null, now = Date.now()): { from: Date; to: Date } {
  const end = parseInstant(to, 'to') ?? new Date(now);
  const start = parseInstant(from, 'from') ?? new Date(end.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);
  if (start >= end) fail('BAD_USER_INPUT', '`from` must be before `to`');
  if (end.getTime() - start.getTime() > MAX_RANGE_DAYS * DAY_MS) fail('BAD_USER_INPUT', 'Choose a window of a year or less');
  return { from: start, to: end };
}

/** Whose calls the actor may read: a manager may narrow to anyone, others only ever see themselves. */
function ownerScope(actor: AuthUser, userId?: string | null): Record<string, unknown> {
  if (isMcpManager(actor)) {
    if (!userId) return {};
    return Types.ObjectId.isValid(userId) ? { user_id: new Types.ObjectId(userId) } : fail('BAD_USER_INPUT', 'Invalid user id');
  }
  if (userId && userId !== actor.id) fail('FORBIDDEN', 'You can only see your own MCP activity');
  return { user_id: new Types.ObjectId(actor.id) };
}

const ERROR_STATUSES = ['ERROR', 'INVALID'];

const bucketStats = {
  calls: { $sum: 1 },
  errors: { $sum: { $cond: [{ $in: ['$status', ERROR_STATUSES] }, 1, 0] } },
  blocked: { $sum: { $cond: [{ $in: ['$status', ['BLOCKED', 'DENIED']] }, 1, 0] } },
  input_tokens: { $sum: '$input_tokens' },
  output_tokens: { $sum: '$output_tokens' },
  cost: { $sum: '$cost' },
  avg_ms: { $avg: '$duration_ms' },
  last_at: { $max: '$created_at' },
};

const groupBy = (key: unknown, sort: Record<string, 1 | -1> = { calls: -1 }): PipelineStage.FacetPipelineStage[] => [
  { $group: { _id: key, ...bucketStats } },
  { $sort: sort },
  { $limit: TOP },
];

interface RawBucket {
  _id: unknown;
  calls: number;
  errors: number;
  blocked: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  avg_ms: number | null;
  last_at: Date | null;
}

const toBucket = (raw: RawBucket) => ({
  key: raw._id === null || raw._id === undefined ? 'unknown' : String(raw._id),
  calls: raw.calls,
  errors: raw.errors,
  blocked: raw.blocked,
  input_tokens: raw.input_tokens,
  output_tokens: raw.output_tokens,
  cost: Math.round(raw.cost * 1_000_000) / 1_000_000,
  avg_ms: Math.round(raw.avg_ms ?? 0),
  last_at: raw.last_at ? raw.last_at.toISOString() : null,
});

export const mcpUsageService = {
  async summary(actor: AuthUser, input: { from?: string | null; to?: string | null; user_id?: string | null }) {
    const { from, to } = rangeOf(input.from, input.to);
    const manager = isMcpManager(actor);
    const match = { ...ownerScope(actor, input.user_id), created_at: { $gte: from, $lt: to } };
    const facets: Record<string, PipelineStage.FacetPipelineStage[]> = {
      totals: [
        { $group: { _id: null, ...bucketStats, users: { $addToSet: '$user_id' } } },
        { $addFields: { users: { $size: '$users' } } },
      ],
      by_tool: groupBy('$tool'),
      by_category: groupBy('$category'),
      by_client: groupBy('$client_name'),
      by_endpoint: groupBy('$endpoint'),
      by_status: groupBy('$status'),
      by_day: groupBy({ $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone: getAppTimeZone() } }, { _id: 1 }),
    };
    if (manager) facets.by_user = groupBy('$user_email');
    const [result] = await McpToolCallModel.aggregate<Record<string, RawBucket[]>>([{ $match: match }, { $facet: facets }]);
    const totals = (result.totals[0] as (RawBucket & { users: number }) | undefined) ?? null;
    const empty = { calls: 0, errors: 0, blocked: 0, input_tokens: 0, output_tokens: 0, cost: 0, avg_ms: 0, last_at: null };
    return {
      scope: manager ? 'ALL' : 'MINE',
      from: from.toISOString(),
      to: to.toISOString(),
      time_zone: getAppTimeZone(),
      totals: totals ? { ...toBucket(totals), key: 'total', users: totals.users } : { ...empty, key: 'total', users: 0 },
      by_tool: result.by_tool.map(toBucket),
      by_category: result.by_category.map(toBucket),
      by_client: result.by_client.map(toBucket),
      by_endpoint: result.by_endpoint.map(toBucket),
      by_status: result.by_status.map(toBucket),
      by_day: result.by_day.map(toBucket),
      by_user: (result.by_user ?? []).map(toBucket),
    };
  },

  async table(actor: AuthUser, input?: TableQueryInput | null) {
    const page = await runTableQuery<IMcpToolCall>(McpToolCallModel, ownerScope(actor), input, TOOL_CALL_TABLE);
    return { rows: page.docs.map(toToolCallPub), total: page.total, page: page.page, page_size: page.page_size };
  },

  async one(actor: AuthUser, id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await McpToolCallModel.findOne({ _id: new Types.ObjectId(id), ...ownerScope(actor) });
    return doc ? toToolCallPub(doc) : null;
  },
};

export function toToolCallPub(doc: IMcpToolCall) {
  return {
    id: String(doc._id),
    created_at: doc.created_at.toISOString(),
    user_id: String(doc.user_id),
    user_email: doc.user_email,
    connection_id: doc.connection_id ? String(doc.connection_id) : null,
    client_name: doc.client_name,
    user_agent: doc.user_agent,
    ip: doc.ip,
    endpoint: doc.endpoint,
    tool: doc.tool,
    category: doc.category,
    kind: doc.kind,
    risk: doc.risk,
    reason: doc.reason,
    args_preview: doc.args_preview,
    status: doc.status,
    error_code: doc.error_code,
    error_message: doc.error_message,
    duration_ms: doc.duration_ms,
    input_tokens: doc.input_tokens,
    output_tokens: doc.output_tokens,
    cost: doc.cost,
    currency: doc.currency,
    injection_flags: [...doc.injection_flags],
    guard_mode: doc.guard_mode,
  };
}
