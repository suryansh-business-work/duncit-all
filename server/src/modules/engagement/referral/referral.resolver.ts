import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { referralService } from './referral.service';

/* Referrals are run from the Finance console (the reward is money-shaped), so
   FINANCE_MANAGER reads and writes them alongside the platform admins. */
const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'FINANCE_MANAGER'];

export const referralResolvers = {
  Query: {
    myReferral: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return referralService.myReferral(user.id);
    },
    referrals: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return referralService.listAll();
    },
    referralsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return referralService.table(args.query);
    },
    referralSettings: async () => referralService.settings(),
  },
  Mutation: {
    applyReferralCode: async (_p: unknown, args: { code: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return referralService.applyCode(user.id, args.code);
    },
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
      requireRole(ctx, ADMIN_WRITE);
      return referralService.updateSettings(args.input);
    },
  },
};
