import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { validate } from '@utils/validate';
import { analyticsService } from './analytics.service';
import { recordAppEventSchema } from './analytics.validator';

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
    userActivityYear: (
      _p: unknown,
      args: { user_id: string; year?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return analyticsService.userActivityYear(args);
    },
    userClickstream: (
      _p: unknown,
      args: { user_id: string; date: string; limit?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return analyticsService.userClickstream(args);
    },
  },
  Mutation: {
    // Both writes are usage analytics: without the caller's consent nothing is
    // stored, and the answer is `false` — the same as a ping with no device.
    recordActivePing: (
      _p: unknown,
      args: { super_category_slug?: string | null },
      ctx: GraphQLContext
    ) => {
      if (!ctx.consent.analytics) return false;
      return analyticsService.recordPing({
        device_id: ctx.device_id ?? null,
        user_id: ctx.user?.id ?? null,
        super_category_slug: args.super_category_slug ?? null,
      });
    },
    recordAppEvent: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      if (!ctx.consent.analytics) return false;
      const input = await validate(recordAppEventSchema, args.input);
      return analyticsService.recordAppEvent({
        input,
        user_id: user.id,
        device_id: ctx.device_id ?? null,
      });
    },
    deleteUserActivityDay: (
      _p: unknown,
      args: { user_id: string; date: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return analyticsService.deleteUserActivityDay(args);
    },
    deleteUserActivityYear: (
      _p: unknown,
      args: { user_id: string; year: number },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return analyticsService.deleteUserActivityYear(args);
    },
  },
};
