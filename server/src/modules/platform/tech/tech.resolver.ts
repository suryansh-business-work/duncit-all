import { techService } from './tech.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const techResolvers = {
  Query: {
    techServerInfo: async (_p: unknown, args: { sslHost?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return techService.serverInfo(args.sslHost ?? undefined);
    },
    techDockerInfo: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return techService.dockerInfo();
    },
    techDockerContainersTable: async (
      _p: unknown,
      args: { query?: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, TECH_MANAGE);
      return techService.containersTable(args.query);
    },
  },
};
