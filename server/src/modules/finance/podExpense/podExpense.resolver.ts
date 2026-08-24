import { podExpenseService } from './podExpense.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

/** Same roles as the company expense ledger — this is the pod-level half of it. */
const FINANCE_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];

export const podExpenseResolvers = {
  Query: {
    podExpensePodsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return podExpenseService.podsTable(args.query);
    },
    podExpensePodSummary: async (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return podExpenseService.podSummary(args.pod_doc_id);
    },
    podExpensesTable: async (
      _p: unknown,
      args: { pod_doc_id: string; query?: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      return podExpenseService.podExpensesTable(args.pod_doc_id, args.query);
    },
    podExpenseSummary: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return podExpenseService.summary();
    },
  },
  Mutation: {
    createPodExpense: async (
      _p: unknown,
      args: { pod_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, FINANCE_RW);
      return podExpenseService.create(args.pod_doc_id, args.input, user.id);
    },
    updatePodExpense: async (
      _p: unknown,
      args: { expense_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      return podExpenseService.update(args.expense_doc_id, args.input);
    },
    deletePodExpense: async (
      _p: unknown,
      args: { expense_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      return podExpenseService.remove(args.expense_doc_id);
    },
  },
};
