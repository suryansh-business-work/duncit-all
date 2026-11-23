import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { PORTAL_ROLE_REQUIREMENTS } from '@modules/portals/portal.constants';
import { targetsDashboardService } from './targetsDashboard.service';

/** The Targets console's seats, plus super admins — the same gate as every screen the dashboard links to. */
const TARGETS_ROLES = ['SUPER_ADMIN', ...PORTAL_ROLE_REQUIREMENTS.targets];

export const targetsDashboardResolvers = {
  Query: {
    targetsDashboard: async (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      targetsDashboardService.overview(requireRole(ctx, TARGETS_ROLES)),
  },
};
