import { expenseService } from './expense.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const FINANCE_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];

export const expenseResolvers = {
  Query: {
    expenses: async (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return expenseService.list(args.filter);
    },
    expenseSummary: async (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return expenseService.summary(args.filter);
    },
  },
  Mutation: {
    createExpense: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, FINANCE_RW);
      return expenseService.create(args.input, user.id);
    },
    updateExpense: async (_p: unknown, args: { expense_doc_id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return expenseService.update(args.expense_doc_id, args.input);
    },
    deleteExpense: async (_p: unknown, args: { expense_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return expenseService.remove(args.expense_doc_id);
    },
    addExpenseRefund: async (_p: unknown, args: { expense_doc_id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return expenseService.addRefund(args.expense_doc_id, args.input);
    },
    removeExpenseRefund: async (_p: unknown, args: { expense_doc_id: string; refund_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return expenseService.removeRefund(args.expense_doc_id, args.refund_id);
    },
  },
};
