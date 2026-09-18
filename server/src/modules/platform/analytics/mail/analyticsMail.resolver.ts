import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import {
  analyticsMailService,
  type AnalyticsMailSettingsInput,
  type AnalyticsMailSubscriptionInput,
} from './analyticsMail.service';

/** The Analytics console's staff, plus the admins who can open every console. */
const ANALYTICS_ROLES = ['SUPER_ADMIN', 'ANALYTICS_MANAGER'];

type IdArgs = { id: string };
type InputArgs<T> = { input: T };

export const analyticsMailResolvers = {
  Query: {
    analyticsMailSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ANALYTICS_ROLES);
      return analyticsMailService.settings();
    },
    analyticsMailSubscriptions: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ANALYTICS_ROLES);
      return analyticsMailService.list();
    },
  },
  Mutation: {
    updateAnalyticsMailSettings: (
      _p: unknown,
      args: InputArgs<AnalyticsMailSettingsInput>,
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ANALYTICS_ROLES);
      return analyticsMailService.updateSettings(args.input);
    },
    createAnalyticsMailSubscription: (
      _p: unknown,
      args: InputArgs<AnalyticsMailSubscriptionInput>,
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, ANALYTICS_ROLES);
      return analyticsMailService.create(args.input, user.email ?? user.id);
    },
    updateAnalyticsMailSubscription: (
      _p: unknown,
      args: IdArgs & InputArgs<AnalyticsMailSubscriptionInput>,
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ANALYTICS_ROLES);
      return analyticsMailService.update(args.id, args.input);
    },
    deleteAnalyticsMailSubscription: (_p: unknown, args: IdArgs, ctx: GraphQLContext) => {
      requireRole(ctx, ANALYTICS_ROLES);
      return analyticsMailService.remove(args.id);
    },
    sendAnalyticsMailNow: (_p: unknown, args: IdArgs, ctx: GraphQLContext) => {
      requireRole(ctx, ANALYTICS_ROLES);
      return analyticsMailService.sendNow(args.id);
    },
  },
};
