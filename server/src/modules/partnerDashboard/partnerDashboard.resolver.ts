import type { GraphQLContext } from '../../context';
import { requireAuth } from '../../middleware/rbac';
import { partnerDashboardService } from './partnerDashboard.service';

export const partnerDashboardResolvers = {
  Query: {
    partnerDashboard: async (_p: unknown, args: { from: string; to: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return partnerDashboardService.get(user.id, args);
    },
  },
};