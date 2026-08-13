import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import type { IDashboardLayout, IDashboardLayoutItem } from './dashboardLayout.model';
import { dashboardLayoutService } from './dashboardLayout.service';

type SaveArgs = { dashboard_id: string; items: IDashboardLayoutItem[] };

const toPublic = (doc: IDashboardLayout) => ({
  dashboard_id: doc.dashboard_id,
  items: doc.items ?? [],
  updated_at: doc.updated_at?.toISOString() ?? null,
});

export const dashboardLayoutResolvers = {
  Query: {
    myDashboardLayout: async (
      _p: unknown,
      args: { dashboard_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      const doc = await dashboardLayoutService.myLayout(user.id, args.dashboard_id);
      return doc ? toPublic(doc) : null;
    },
  },
  Mutation: {
    saveDashboardLayout: async (_p: unknown, args: SaveArgs, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const doc = await dashboardLayoutService.save(user.id, args.dashboard_id, args.items);
      return toPublic(doc);
    },
    resetDashboardLayout: async (
      _p: unknown,
      args: { dashboard_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return dashboardLayoutService.reset(user.id, args.dashboard_id);
    },
  },
};
