import type { GraphQLContext } from '@context';
import { LOGS_READER, readScope, requireRole, TESTS_MANAGER } from '@middleware/rbac';
import { callerEnvironment } from '@modules/ai/askBot/askBot.links';
import { LocationModel } from '@modules/platform/location/location.model';
import { entityAnalyticsService } from './entityAnalytics.service';
import type { AnalyticsEntity } from './shapes';
import type { PeriodRequest } from './window';

/** The Analytics console's staff, plus the admins who can open every console. */
const ANALYTICS_ROLES = ['SUPER_ADMIN', 'ANALYTICS_MANAGER'];

/**
 * SonarQube is also Tests → Code Quality → SonarQube. Tech's staff keep reading
 * it: it was Tech → Security → SonarQube until the Tests console took it.
 */
const TECH_READER = 'TECH_MANAGER';

/** Admin > User Management's staff: the Users page is also Admin's Users Dashboard. */
const USER_MANAGERS = ['CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];

/** The Communications console's staff: the Communications page is also that console's Dashboard. */
const COMMUNICATIONS_READER = 'COMMUNICATIONS_MANAGER';

/** The Marketing console's staff: the Contacts page is also Marketing > Contacts. */
const MARKETING_READER = 'MARKETING_MANAGER';

/** Who may read one page: a dashboard another console mounts too is read by that console's staff as well. */
export const entityReaders = (entity: AnalyticsEntity) => {
  if (entity === 'LOGS') return [...ANALYTICS_ROLES, LOGS_READER];
  if (entity === 'USERS') return [...ANALYTICS_ROLES, ...USER_MANAGERS];
  if (entity === 'SONARQUBE') return [...ANALYTICS_ROLES, TECH_READER, TESTS_MANAGER];
  if (entity === 'COMMUNICATIONS') return [...ANALYTICS_ROLES, COMMUNICATIONS_READER];
  if (entity === 'CONTACTS') return [...ANALYTICS_ROLES, MARKETING_READER];
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
      // The Users page is also Admin's Users Dashboard, read by City and Zonal
      // Admins: held to their own place, and refused without one (readScope).
      const scope = entity === 'USERS' ? readScope(ctx) : null;
      // Links open the console the reader is actually using — local, staging or production.
      return entityAnalyticsService.load(entity, period, callerEnvironment(ctx.req), scope);
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
