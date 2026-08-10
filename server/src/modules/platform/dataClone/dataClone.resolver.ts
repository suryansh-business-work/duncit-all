import { dataCloneService } from './dataClone.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
// Same guard as the Tech web terminal: a clone reads every production document
// and rewrites a whole database, so it sits at the portal's top role.
import { TECH_EXEC } from '../tech/tech.resolver';

export const dataCloneResolvers = {
  Query: {
    dataCloneTargets: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_EXEC);
      return dataCloneService.targets();
    },
    dataCloneJob: (_p: unknown, args: { id?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_EXEC);
      return dataCloneService.job(args.id);
    },
  },
  Mutation: {
    startDataClone: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_EXEC);
      return dataCloneService.start(user);
    },
  },
};
