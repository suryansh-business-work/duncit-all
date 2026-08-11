import { dataCloneService } from './dataClone.service';
import {
  dataCloneConnectionService,
  type SaveConnectionInput,
} from './dataCloneConnection.service';
import type { DataCloneRole } from './dataCloneConnection.model';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
// Same guard as the Tech web terminal: a clone reads every production document
// and rewrites a whole database, so it sits at the portal's top role. The
// connection settings hold live database credentials, so they sit there too.
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
    dataCloneSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_EXEC);
      return dataCloneConnectionService.settings();
    },
  },
  Mutation: {
    startDataClone: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_EXEC);
      return dataCloneService.start(user);
    },
    saveDataCloneConnection: (
      _p: unknown,
      args: { role: DataCloneRole; input: SaveConnectionInput },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, TECH_EXEC);
      return dataCloneConnectionService.save(args.role, args.input);
    },
    testDataCloneConnection: (
      _p: unknown,
      args: { role: DataCloneRole },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, TECH_EXEC);
      return dataCloneConnectionService.test(args.role);
    },
  },
};
