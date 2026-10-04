import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { TECH_MANAGE } from '../tech/tech.resolver';
import { portMapService } from './portMap.service';

export const portMapResolvers = {
  Query: {
    portMappings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return portMapService.overview();
    },
  },
};
