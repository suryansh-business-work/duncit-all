import { packageUpdatesService } from './packageUpdates.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

/** The same pair that guards the rest of the Tech console's host-level reads. */
const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const packageUpdatesResolvers = {
  Query: {
    techPackageUpdates: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return packageUpdatesService.report();
    },
  },
  Mutation: {
    techRefreshPackageUpdates: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return packageUpdatesService.report(true);
    },
  },
};
