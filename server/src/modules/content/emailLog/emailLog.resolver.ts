import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { emailLogService } from './emailLog.service';
import type { TableQueryInput } from '@utils/table-query';

/** The same roles that manage the templates and fragments these rows describe. */
const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN'];

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
  },
};
