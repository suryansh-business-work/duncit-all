import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { referralService } from './referral.service';

/* The member side of referrals. The admin side — the log, the settings and the
   Refer & Earn dashboard — lives in referral.admin.resolver.ts. */
export const referralResolvers = {
  Query: {
    myReferral: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return referralService.myReferral(user.id);
    },
  },
  Mutation: {
    applyReferralCode: async (_p: unknown, args: { code: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return referralService.applyCode(user.id, args.code);
    },
  },
};
