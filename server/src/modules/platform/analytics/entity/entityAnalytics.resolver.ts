import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { entityAnalyticsService } from './entityAnalytics.service';
import type { AnalyticsEntity } from './shapes';

/** The Analytics console's staff, plus the admins who can open every console. */
const ANALYTICS_ROLES = ['SUPER_ADMIN', 'ANALYTICS_MANAGER'];

export const entityAnalyticsResolvers = {
  Query: {
    entityAnalytics: (
      _p: unknown,
      args: { entity: AnalyticsEntity; days?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ANALYTICS_ROLES);
      return entityAnalyticsService.load(args.entity, args.days);
    },
  },
};
