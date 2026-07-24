import { techService } from './tech.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];
// The web terminal runs arbitrary commands in the API container, which holds the
// docker socket → host-root-equivalent. Restrict it to the top role only.
const TECH_EXEC = ['SUPER_ADMIN'];

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
    techDockerContainersTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return techService.containersTable(args.query);
    },
    techContainerLogs: async (
      _p: unknown,
      args: { name: string; tail?: number | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, TECH_MANAGE);
      return techService.containerLogs(args.name, args.tail ?? 200);
    },
  },
  Mutation: {
    techRestartContainer: async (_p: unknown, args: { name: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_MANAGE);
      return techService.restartContainer(args.name, user);
    },
    techExec: async (_p: unknown, args: { command: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_EXEC);
      return techService.execCommand(args.command, user);
    },
  },
};
