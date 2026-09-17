import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { backgroundJobService, type StartBulkDeleteInput } from './backgroundJob.service';

/**
 * Every signed-in person, not a role list: jobs are always scoped to their
 * owner, and who may delete from which table is decided per table — by the
 * target's roles here and by the table's own resolvers for every row.
 */
export const backgroundJobResolvers = {
  Query: {
    bulkDeletableTables: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      backgroundJobService.deletableTables(requireAuth(ctx)),
    myBackgroundJobs: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      backgroundJobService.mine(requireAuth(ctx)),
  },
  Mutation: {
    startBulkDelete: (_p: unknown, args: { input: StartBulkDeleteInput }, ctx: GraphQLContext) =>
      backgroundJobService.startBulkDelete(requireAuth(ctx), args.input),
    cancelBackgroundJob: (_p: unknown, args: { id: string }, ctx: GraphQLContext) =>
      backgroundJobService.cancel(requireAuth(ctx), args.id),
    dismissBackgroundJob: (_p: unknown, args: { id: string }, ctx: GraphQLContext) =>
      backgroundJobService.dismiss(requireAuth(ctx), args.id),
    clearFinishedBackgroundJobs: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      backgroundJobService.clearFinished(requireAuth(ctx)),
  },
};
