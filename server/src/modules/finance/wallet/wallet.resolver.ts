import { walletService } from './wallet.service';
import {
  walletStatementService,
  type WalletStatementFormat,
  type WalletStatementInput,
} from './walletStatement.service';
import type { IMinWithdrawal } from '@modules/finance/finance/finance.model';
import type { GraphQLContext } from '@context';
import { FINANCE_READER, requireAuth, requireRole } from '@middleware/rbac';
import { assertPlatformFinanceWrite, assertPodFinanceScope } from '../financeScope';
import { financeTargets } from '../financeScope.targets';

// Same set updateFinanceSettings guards the finance singleton with — the
// withdrawal minimums live on that singleton, so they answer to the same roles.
const FINANCE_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];
// The Finance console's reads — the analyst seat reads them, never writes.
const FINANCE_READ = [...FINANCE_RW, FINANCE_READER];

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
    // Owner-scoped by construction: both read the ledger of `ctx.user.id` and
    // take no user argument, so there is no id for a caller to swap.
    myWalletStatement: async (_p: unknown, args: { input: WalletStatementInput }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return walletStatementService.statement(user.id, args.input);
    },
    myWalletStatementFile: async (
      _p: unknown,
      args: { input: WalletStatementInput; format: WalletStatementFormat },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return walletStatementService.file(user.id, args.input, args.format);
    },
    withdrawalRequests: async (_p: unknown, args: { status?: string }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return walletService.listAllWithdrawals(args.status);
    },
    withdrawalRequestsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return walletService.withdrawalsTable(args.query);
    },
    podWithdrawalGroupsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return walletService.podWithdrawalGroupsTable(args.query);
    },
    podWithdrawalSummary: async (_p: unknown, args: { pod_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return walletService.podWithdrawalSummary(args.pod_id);
    },
    podWithdrawalsTable: async (
      _p: unknown,
      args: { pod_id: string; query?: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_READ);
      return walletService.podWithdrawalsTable(args.pod_id, args.query);
    },
    withdrawalMinimums: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return walletService.getWithdrawalMinimums();
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
      // Paying out a withdrawal pays for every pod it draws on — a city admin
      // may only when each of those pods is in their city.
      await assertPodFinanceScope(ctx, FINANCE_RW, () => financeTargets.withdrawal(args.withdrawal_id));
      return walletService.reviewWithdrawal(args.withdrawal_id, args.input.status, args.input.reason, user.id);
    },
    updateWithdrawalMinimums: async (
      _p: unknown,
      args: { input: Partial<IMinWithdrawal> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      assertPlatformFinanceWrite(ctx, FINANCE_RW);
      return walletService.updateWithdrawalMinimums(args.input);
    },
  },
};
