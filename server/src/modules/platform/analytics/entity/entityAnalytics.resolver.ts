import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { callerEnvironment } from '@modules/ai/askBot/askBot.links';
import { LocationModel } from '@modules/platform/location/location.model';
import { entityAnalyticsService } from './entityAnalytics.service';
import type { AnalyticsEntity } from './shapes';
import type { PeriodRequest } from './window';

/** The Analytics console's staff, plus the admins who can open every console. */
const ANALYTICS_ROLES = ['SUPER_ADMIN', 'ANALYTICS_MANAGER'];

export const entityAnalyticsResolvers = {
  Query: {
    entityAnalytics: (
      _p: unknown,
      args: PeriodRequest & { entity: AnalyticsEntity },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ANALYTICS_ROLES);
      const { entity, ...period } = args;
      // Links open the console the reader is actually using — local, staging or production.
      return entityAnalyticsService.load(entity, period, callerEnvironment(ctx.req));
    },
    /** The cities a page can be narrowed to — every live location, by name. */
    analyticsCities: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ANALYTICS_ROLES);
      const rows = await LocationModel.find({ is_active: true })
        .select('location_name')
        .sort({ location_name: 1 })
        .lean<Array<{ _id: unknown; location_name: string }>>();
      return rows.map((row) => ({ id: String(row._id), name: row.location_name }));
    },
  },
};
