import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { tableChangeLogService, type TableChangeLogsArgs } from './tableChangeLog.service';

/**
 * Every signed-in person, not a role list: who may read a table's history is
 * decided by that table's own resolver, which the service runs as the caller.
 */
export const tableChangeLogResolvers = {
  Query: {
    tableChangeLogs: (_p: unknown, args: TableChangeLogsArgs, ctx: GraphQLContext) =>
      tableChangeLogService.logs(requireAuth(ctx), args),
  },
};
