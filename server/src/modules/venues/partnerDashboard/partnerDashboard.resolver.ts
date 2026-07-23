import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { partnerDashboardService } from './partnerDashboard.service';

export const partnerDashboardResolvers = {
  Query: {
    partnerDashboard: async (_p: unknown, args: { from: string; to: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return partnerDashboardService.get(user.id, args);
    },
    venueOwnerStats: async (_p: unknown, args: { venue_id?: string | null }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return partnerDashboardService.venueStats(user.id, args.venue_id);
    },
    partnerEcommStats: async (_p: unknown, args: { brand_doc_id?: string | null }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return partnerDashboardService.ecommStats(user.id, args.brand_doc_id);
    },
  },
};