import { podExpenseService } from './podExpense.service';
import type { GraphQLContext } from '@context';
import { FINANCE_READER, requireRole } from '@middleware/rbac';
import { assertPodFinanceScope } from '../financeScope';
import { financeTargets } from '../financeScope.targets';

/** Same roles as the company expense ledger — this is the pod-level half of it. */
const FINANCE_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];
// The Finance console's reads — the analyst seat reads them, never writes.
const FINANCE_READ = [...FINANCE_RW, FINANCE_READER];

export const podExpenseResolvers = {
  Query: {
    podExpensePodsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return podExpenseService.podsTable(args.query);
    },
    podExpensePodSummary: async (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return podExpenseService.podSummary(args.pod_doc_id);
    },
    podExpensesTable: async (
      _p: unknown,
      args: { pod_doc_id: string; query?: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_READ);
      return podExpenseService.podExpensesTable(args.pod_doc_id, args.query);
    },
    podExpenseSummary: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return podExpenseService.summary();
    },
  },
  // A pod's bill is that pod's money: a city admin records it for their own
  // city's pods only.
  Mutation: {
    createPodExpense: async (
      _p: unknown,
      args: { pod_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, FINANCE_RW);
      await assertPodFinanceScope(ctx, FINANCE_RW, () => [args.pod_doc_id]);
      return podExpenseService.create(args.pod_doc_id, args.input, user.id);
    },
    updatePodExpense: async (
      _p: unknown,
      args: { expense_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      await assertPodFinanceScope(ctx, FINANCE_RW, () => financeTargets.podExpense(args.expense_doc_id));
      return podExpenseService.update(args.expense_doc_id, args.input);
    },
    deletePodExpense: async (
      _p: unknown,
      args: { expense_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      await assertPodFinanceScope(ctx, FINANCE_RW, () => financeTargets.podExpense(args.expense_doc_id));
      return podExpenseService.remove(args.expense_doc_id);
    },
  },
};
