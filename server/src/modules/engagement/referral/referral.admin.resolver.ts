import type { GraphQLContext } from '@context';
import { LOYALTY_ADMIN_READ, LOYALTY_ADMIN_WRITE, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { referralService } from './referral.service';
import { referralAdminService } from './referral.admin.service';

/* Referrals are run from the Loyalty console (Refer & Earn), beside the coins
   they pay out. The Finance seats that ran them before the move keep their
   doors through the Loyalty gates; FINANCE_USER reads and never writes. */
export const referralAdminResolvers = {
  Query: {
    referrals: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return referralService.listAll();
    },
    referralsTable: async (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return referralService.table(args.query);
    },
    referralSettings: async () => referralService.settings(),
    referralAdminStats: async (_p: unknown, args: { months?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return referralAdminService.stats(args.months);
    },
    referrersTable: async (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return referralAdminService.referrersTable(args.query);
    },
  },
  Mutation: {
    updateReferralSettings: async (
      _p: unknown,
      args: {
        input: {
          gift_description?: string | null;
          share_message?: string | null;
        };
      },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, LOYALTY_ADMIN_WRITE);
      return referralService.updateSettings(args.input);
    },
  },
};
