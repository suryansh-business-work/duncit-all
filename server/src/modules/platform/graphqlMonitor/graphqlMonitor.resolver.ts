import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { graphqlMonitorService } from './graphqlMonitor.service';

/**
 * Platform plumbing, read and tuned from the Tech portal only: the operation
 * list names every document every client sends, which is a map of the API
 * nobody outside engineering needs.
 */
const MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

type RangeArgs = { range?: string | null };

export const graphqlMonitorResolvers = {
  Query: {
    graphqlMonitorOverview: (_p: unknown, args: RangeArgs, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return graphqlMonitorService.overview(args.range);
    },
    graphqlMonitorOperations: (_p: unknown, args: RangeArgs, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return graphqlMonitorService.operations(args.range);
    },
    graphqlMonitorOperation: (_p: unknown, args: RangeArgs & { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return graphqlMonitorService.operation(args.id, args.range);
    },
    graphqlMonitorTraces: (_p: unknown, args: { operation_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return graphqlMonitorService.traces(args.operation_id);
    },
    graphqlMonitorTrace: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return graphqlMonitorService.trace(args.id);
    },
    graphqlMonitorFields: (_p: unknown, args: RangeArgs, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return graphqlMonitorService.fields(args.range);
    },
    graphqlMonitorErrors: (_p: unknown, args: RangeArgs, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return graphqlMonitorService.errors(args.range);
    },
    graphqlMonitorSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, MANAGE);
      return graphqlMonitorService.settings();
    },
  },
  Mutation: {
    updateGraphqlMonitorSettings: (
      _p: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, MANAGE);
      return graphqlMonitorService.updateSettings(args.input);
    },
  },
};
