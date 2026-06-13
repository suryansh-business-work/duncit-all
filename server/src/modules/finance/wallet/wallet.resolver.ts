import { walletService } from './wallet.service';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

const FINANCE_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];

export const walletResolvers = {
  Query: {
    myWallet: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return walletService.getMyWallet(user.id);
    },
    myWalletTransactions: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return walletService.listTransactions(user.id);
    },
    myWithdrawals: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return walletService.listMyWithdrawals(user.id);
    },
    withdrawalRequests: async (_p: unknown, args: { status?: string }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return walletService.listAllWithdrawals(args.status);
    },
  },
  Mutation: {
    requestWithdrawal: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return walletService.requestWithdrawal(user.id, args.input);
    },
    reviewWithdrawal: async (
      _p: unknown,
      args: { withdrawal_id: string; input: { status: string; reason?: string } },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, FINANCE_RW);
      return walletService.reviewWithdrawal(args.withdrawal_id, args.input.status, args.input.reason, user.id);
    },
  },
};
