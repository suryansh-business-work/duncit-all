import { userAuditService } from './userAudit.service';
import type { UserChangeLogScope } from './userAudit.model';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';

/**
 * The same roles that may open a user's details page — the change log is one
 * tab of it, and gating it more tightly would show an admin a tab they cannot
 * read.
 */
const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];

export const userAuditResolvers = {
  Query: {
    userChangeLogsTable: async (
      _p: unknown,
      args: { user_id: string; scope: UserChangeLogScope; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return userAuditService.table(args.user_id, args.scope, args.query);
    },
  },
};
