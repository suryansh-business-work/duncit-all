import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';
import { analyticsService } from './analytics.service';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const analyticsResolvers = {
  Query: {
    activeUserStats: (
      _p: unknown,
      args: { from: string; to: string; granularity?: any; super_category_slug?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return analyticsService.stats(args);
    },
    dashboardTotals: (
      _p: unknown,
      args: { super_category_slug?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return analyticsService.dashboardTotals(args.super_category_slug);
    },
  },
  Mutation: {
    recordActivePing: (
      _p: unknown,
      args: { super_category_slug?: string | null },
      ctx: GraphQLContext
    ) => {
      return analyticsService.recordPing({
        device_id: ctx.device_id ?? null,
        user_id: ctx.user?.id ?? null,
        super_category_slug: args.super_category_slug ?? null,
      });
    },
  },
};
