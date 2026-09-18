import { techService } from './tech.service';
import { serverHistory } from './tech.history.service';
import { generateServerAdvice, latestServerAdvice } from './tech.advice';
import { databaseCollectionsTable, databaseInfo } from './tech.database';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];
// The web terminal runs arbitrary commands in the API container, which holds the
// docker socket → host-root-equivalent. Restrict it to the top role only.
// Exported so the other host-level Tech operations (the data clone) guard
// themselves with this exact list rather than a second, weaker copy.
export const TECH_EXEC = ['SUPER_ADMIN'];

export const techResolvers = {
  Query: {
    techServerInfo: async (_p: unknown, args: { sslHost?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return techService.serverInfo(args.sslHost ?? undefined);
    },
    techServerHistory: async (_p: unknown, args: { days?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return serverHistory(args.days ?? undefined);
    },
    techServerAdvice: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return latestServerAdvice();
    },
    techDatabaseInfo: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return databaseInfo();
    },
    techDatabaseCollectionsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return databaseCollectionsTable(args.query);
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
    techGenerateServerAdvice: async (_p: unknown, args: { sslHost?: string | null }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_MANAGE);
      return generateServerAdvice(user, args.sslHost ?? undefined);
    },
    techExec: async (_p: unknown, args: { command: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_EXEC);
      return techService.execCommand(args.command, user);
    },
  },
};
