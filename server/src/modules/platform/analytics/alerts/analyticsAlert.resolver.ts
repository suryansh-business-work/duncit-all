import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { AnalyticsEntity } from '../entity/shapes';
import { entityReaders } from '../entity/entityAnalytics.resolver';
import { analyticsTargetService } from '../goals/analyticsTarget.service';
import { analyticsAlertService, type AnalyticsAlertInput } from './analyticsAlert.service';

/** The Analytics console's staff, plus the admins who can open every console. */
const ANALYTICS_ROLES = ['SUPER_ADMIN', 'ANALYTICS_MANAGER'];

type IdArgs = { id: string };
type InputArgs = { input: AnalyticsAlertInput };
type TargetArgs = { entity: AnalyticsEntity; key: string; value?: number | null };

/** Alerts and tile goals — the two things an Analytics reader sets on a number. */
export const analyticsAlertResolvers = {
  Query: {
    analyticsAlerts: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ANALYTICS_ROLES);
      return analyticsAlertService.list();
    },
  },
  Mutation: {
    createAnalyticsAlert: (_p: unknown, args: InputArgs, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ANALYTICS_ROLES);
      return analyticsAlertService.create(args.input, user.email ?? user.id);
    },
    updateAnalyticsAlert: (_p: unknown, args: IdArgs & InputArgs, ctx: GraphQLContext) => {
      requireRole(ctx, ANALYTICS_ROLES);
      return analyticsAlertService.update(args.id, args.input);
    },
    deleteAnalyticsAlert: (_p: unknown, args: IdArgs, ctx: GraphQLContext) => {
      requireRole(ctx, ANALYTICS_ROLES);
      return analyticsAlertService.remove(args.id);
    },
    checkAnalyticsAlertNow: (_p: unknown, args: IdArgs, ctx: GraphQLContext) => {
      requireRole(ctx, ANALYTICS_ROLES);
      return analyticsAlertService.checkNow(args.id);
    },
    setAnalyticsTarget: (_p: unknown, args: TargetArgs, ctx: GraphQLContext) => {
      // A tile's goal is set by whoever reads that page — the Logs console's staff on the Logs dashboard.
      const user = requireRole(ctx, entityReaders(args.entity));
      return analyticsTargetService.set(args.entity, args.key, args.value ?? null, user.email ?? user.id);
    },
  },
};
