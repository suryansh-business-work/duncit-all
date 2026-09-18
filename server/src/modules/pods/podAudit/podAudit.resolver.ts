import { GraphQLError } from 'graphql';
import { podAuditService } from './podAudit.service';
import type { GraphQLContext } from '@context';
import { LOGS_READER, requireAuth, requireRole } from '@middleware/rbac';

/** Admin-console roles that may read the full monitoring trail — and the Logs
 * console, which mounts the same Pod Monitoring page. */
const ADMIN_READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', LOGS_READER];

export const podAuditResolvers = {
  Query: {
    podAuditLogsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return podAuditService.table(args.query);
    },
    clubAdminPodAuditLogsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      // Club-admin scoping happens in the service (SUPER_ADMIN sees all);
      // holders of neither role get an empty club scope, so require the role
      // up-front for a clear error.
      const roles = ctx.user?.roles ?? [];
      if (!roles.includes('CLUB_ADMIN') && !roles.includes('SUPER_ADMIN')) {
        throw new GraphQLError('Access Denied', { extensions: { code: 'FORBIDDEN' } });
      }
      return podAuditService.tableForClubAdmin({ id: user.id, roles }, args.query);
    },
    podAuditLogs: async (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return podAuditService.listForPod(args.pod_doc_id);
    },
  },
};
