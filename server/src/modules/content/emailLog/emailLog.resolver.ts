import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { emailLogService } from './emailLog.service';
import type { TableQueryInput } from '@utils/table-query';

/**
 * The same roles that manage the templates and fragments these rows describe,
 * plus TECH_MANAGER — the only screen that reads any of this is /emails/logs in
 * the Tech portal, which admits TECH_MANAGER, so leaving it out meant that
 * account opened the page and got Access Denied from every query on it.
 */
const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'TECH_MANAGER'];

/**
 * Emptying the log is not a scoped mistake — it removes the only record of the
 * emails that never reached a provider, and nothing anywhere restores it. That
 * is narrower than "can read the page", so it is held by the one account that
 * answers for the platform.
 */
const DELETE_ALL_ROLES = ['SUPER_ADMIN'];

export const emailLogResolvers = {
  Query: {
    emailLogsTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailLogService.table(args.query);
    },
    emailLog: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailLogService.byId(args.id);
    },
    emailLogStats: (_p: unknown, args: { days?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailLogService.stats(args.days ?? 7);
    },
    emailLogDashboard: (
      _p: unknown,
      args: { range_days?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailLogService.dashboard(args.range_days);
    },
    // Read by the Templates page, not this one — the counts it puts on every
    // template are the log's, so the log answers for them and for who may see
    // them. Same roles: a slug and a tally give away nothing the table beside
    // them does not.
    emailTemplateUsage: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailLogService.usageByTemplate();
    },
  },
  Mutation: {
    deleteEmailLogs: (_p: unknown, args: { ids: string[] }, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, ADMIN_ROLES);
      return emailLogService.deleteByIds(args.ids, actor);
    },
    deleteAllEmailLogs: (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, DELETE_ALL_ROLES);
      return emailLogService.deleteAll(actor);
    },
  },
};
