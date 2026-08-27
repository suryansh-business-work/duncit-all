import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { rateLimitService } from './rateLimit.service';

/**
 * Rate limiting is platform plumbing, so it is read and written from the Tech
 * portal only. Support and the city admins have no business seeing which
 * addresses are being refused, and no reason to raise a ceiling.
 */
const MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

/**
 * Every timestamp on these types is declared `String` in the schema, and the
 * String scalar serializes a Date through `valueOf()` — so a raw Date leaves
 * as epoch millis ('1787824800000'), which the console reads back as an Invalid
 * Date and throws on while it paints the grid. ISO is what every other module
 * sends and what the portal's date cells parse.
 */
function isoDates(plain: object): Record<string, unknown> {
  const out: Record<string, unknown> = { ...plain };
  for (const [key, value] of Object.entries(out)) {
    if (value instanceof Date) out[key] = value.toISOString();
  }
  return out;
}

/** `_id` is what Mongo returns; the API has always spoken `id`. */
function withId<T extends { _id?: unknown; toObject?: () => Record<string, unknown> }>(doc: T) {
  const plain = doc.toObject ? doc.toObject() : (doc as Record<string, unknown>);
  return { ...isoDates(plain), id: String((plain as { _id: unknown })._id) };
}

function requireRule<T>(doc: T | null): T {
  if (!doc) throw new GraphQLError('Rule not found', { extensions: { code: 'NOT_FOUND' } });
  return doc;
}

export const rateLimitResolvers = {
  Query: {
    rateLimitSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return isoDates(await rateLimitService.getSettings());
    },
    rateLimitRules: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return (await rateLimitService.listRules()).map(withId);
    },
    rateLimitRulesTable: async (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, MANAGE);
      const page = await rateLimitService.rulesTable(args.query);
      return { total: page.total, rows: page.rows.map(withId) };
    },
    rateLimitRule: async (_p: unknown, args: { rule_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      const doc = await rateLimitService.getRule(args.rule_id);
      return doc ? withId(doc) : null;
    },
    rateLimitSystems: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      const rows = await rateLimitService.systems();
      return rows.map((row) => ({ ...isoDates(row), id: String(row._id) }));
    },
    rateLimitEventsTable: async (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, MANAGE);
      const page = await rateLimitService.eventsTable(args.query);
      return { total: page.total, rows: page.rows.map((row) => withId(row)) };
    },
    rateLimitStats: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return rateLimitService.stats();
    },
    rateLimitOptions: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return rateLimitService.options();
    },
  },
  Mutation: {
    createRateLimitRule: async (
      _p: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, MANAGE);
      return withId(await rateLimitService.createRule(args.input));
    },
    updateRateLimitRule: async (
      _p: unknown,
      args: { rule_id: string; input: Record<string, unknown> },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, MANAGE);
      return withId(requireRule(await rateLimitService.updateRule(args.rule_id, args.input)));
    },
    setRateLimitRuleEnabled: async (
      _p: unknown,
      args: { rule_id: string; enabled: boolean },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, MANAGE);
      return withId(requireRule(await rateLimitService.setRuleEnabled(args.rule_id, args.enabled)));
    },
    deleteRateLimitRule: async (_p: unknown, args: { rule_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return rateLimitService.deleteRule(args.rule_id);
    },
    resetRateLimitRuleCounters: async (
      _p: unknown,
      args: { rule_id: string },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, MANAGE);
      return withId(requireRule(await rateLimitService.resetRuleCounters(args.rule_id)));
    },
    updateRateLimitSettings: async (
      _p: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, MANAGE);
      return isoDates(await rateLimitService.updateSettings(args.input));
    },
    resetRateLimitCounters: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return rateLimitService.resetCounters();
    },
    clearRateLimitEvents: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return rateLimitService.clearEvents();
    },
  },
};
