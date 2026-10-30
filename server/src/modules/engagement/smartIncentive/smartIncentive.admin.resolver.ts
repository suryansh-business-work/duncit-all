import type { GraphQLContext } from '@context';
import { LOYALTY_ADMIN_READ, LOYALTY_ADMIN_WRITE, requireAuth, requireRole } from '@middleware/rbac';
import { smartIncentiveAdminService } from './smartIncentive.admin.service';
import { smartIncentiveSettingsService } from './smartIncentive.settings.service';

/* Run from the Loyalty console beside the other programmes. The settings are
   read by any signed-in account — a host's Create Pod form is capped by the
   ceiling — but only the Loyalty write seats change them. */
export const smartIncentiveAdminResolvers = {
  Query: {
    smartIncentiveSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return smartIncentiveSettingsService.pub();
    },
    smartIncentiveAdminStats: async (_p: unknown, args: { months?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return smartIncentiveAdminService.stats(args.months);
    },
  },
  Mutation: {
    updateSmartIncentiveSettings: async (
      _p: unknown,
      args: { input: { enabled?: boolean | null; delay_seconds?: number | null; max_discount_pct?: number | null } },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, LOYALTY_ADMIN_WRITE);
      return smartIncentiveSettingsService.update(args.input);
    },
  },
};
