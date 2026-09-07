import { employeeExpenseService } from './employeeExpense.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';

/**
 * Two different people use this module, so it has two different gates.
 *
 * The employee half is scoped to the caller's OWN id inside the service — the
 * role only says "you may file a claim", never "you may read claims", so an
 * employee cannot reach anybody else's row by asking for it.
 */
const EMPLOYEE_RW = ['EMPLOYEE', 'SUPER_ADMIN'];
/** The company ledger's roles — deciding a claim is a Finance decision. */
const FINANCE_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];

interface TableArgs {
  query?: TableQueryInput | null;
}
interface ExpenseInputArgs {
  expense_doc_id: string;
  input: unknown;
}

export const employeeExpenseResolvers = {
  Query: {
    myEmployeeExpensesTable: async (_p: unknown, args: TableArgs, ctx: GraphQLContext) => {
      const user = requireRole(ctx, EMPLOYEE_RW);
      return employeeExpenseService.myTable(user.id, args.query);
    },
    myEmployeeExpenseSummary: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, EMPLOYEE_RW);
      return employeeExpenseService.mySummary(user.id);
    },
    employeeExpensesTable: async (_p: unknown, args: TableArgs, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return employeeExpenseService.financeTable(args.query);
    },
    employeeExpenseSummary: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return employeeExpenseService.financeSummary();
    },
  },
  Mutation: {
    createEmployeeExpense: async (
      _p: unknown,
      args: { input: unknown },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, EMPLOYEE_RW);
      return employeeExpenseService.create(user.id, args.input);
    },
    updateEmployeeExpense: async (_p: unknown, args: ExpenseInputArgs, ctx: GraphQLContext) => {
      const user = requireRole(ctx, EMPLOYEE_RW);
      return employeeExpenseService.update(args.expense_doc_id, user.id, args.input);
    },
    deleteEmployeeExpense: async (
      _p: unknown,
      args: { expense_doc_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, EMPLOYEE_RW);
      return employeeExpenseService.remove(args.expense_doc_id, user.id);
    },
    reviewEmployeeExpense: async (
      _p: unknown,
      args: { expense_doc_id: string; decision: string; note?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, FINANCE_RW);
      return employeeExpenseService.review(
        args.expense_doc_id,
        args.decision,
        args.note ?? '',
        user.id
      );
    },
  },
};
