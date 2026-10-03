import type { GraphQLContext } from '@context';
import { LOGS_READER, requireRole } from '@middleware/rbac';
import { callerEnvironment } from '@modules/ai/askBot/askBot.links';
import { LocationModel } from '@modules/platform/location/location.model';
import { entityAnalyticsService } from './entityAnalytics.service';
import type { AnalyticsEntity } from './shapes';
import type { PeriodRequest } from './window';

/** The Analytics console's staff, plus the admins who can open every console. */
const ANALYTICS_ROLES = ['SUPER_ADMIN', 'ANALYTICS_MANAGER'];

/** The Tech console's staff: SonarQube is also Tech → Security → SonarQube. */
const TECH_READER = 'TECH_MANAGER';

/** Who may read one page: a dashboard another console mounts too is read by that console's staff as well. */
export const entityReaders = (entity: AnalyticsEntity) => {
  if (entity === 'LOGS') return [...ANALYTICS_ROLES, LOGS_READER];
  if (entity === 'SONARQUBE') return [...ANALYTICS_ROLES, TECH_READER];
  return ANALYTICS_ROLES;
};

export const entityAnalyticsResolvers = {
  Query: {
    entityAnalytics: (
      _p: unknown,
      args: PeriodRequest & { entity: AnalyticsEntity },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, entityReaders(args.entity));
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
