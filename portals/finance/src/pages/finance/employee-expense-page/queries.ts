import { gql } from '@apollo/client';
import { EMPLOYEE_EXPENSE_SELECTION } from '@duncit/utils';
import type { TableFilterValue } from '@duncit/table';

export const EMPLOYEE_EXPENSES_TABLE = gql`
  query EmployeeExpensesTable($query: TableQueryInput) {
    employeeExpensesTable(query: $query) {
      total
      rows {
        ${EMPLOYEE_EXPENSE_SELECTION}
      }
    }
  }
`;

export const EMPLOYEE_EXPENSE_SUMMARY = gql`
  query EmployeeExpenseSummary {
    employeeExpenseSummary {
      claimed_total
      pending_total
      approved_total
      rejected_total
      pending_count
      approved_count
      rejected_count
      claim_count
      employee_count
    }
    publicFinanceSettings {
      currency_symbol
    }
  }
`;

export const REVIEW_EMPLOYEE_EXPENSE = gql`
  mutation ReviewEmployeeExpense($expense_doc_id: ID!, $decision: String!, $note: String) {
    reviewEmployeeExpense(expense_doc_id: $expense_doc_id, decision: $decision, note: $note) {
      ${EMPLOYEE_EXPENSE_SELECTION}
    }
  }
`;

/** The company ledger's title-caser — one way to read a CONSTANT_CASE code. */
export { labelize } from '../expense-management-page/queries';

/** The queue's scope tabs. Each is a pinned status filter on the same list. */
export type ClaimScope = 'pending' | 'approved' | 'rejected' | 'all';

export const SCOPE_FILTERS: Readonly<Record<ClaimScope, readonly TableFilterValue[]>> = {
  pending: [{ field: 'status', op: 'eq', value: 'PENDING' }],
  approved: [{ field: 'status', op: 'eq', value: 'APPROVED' }],
  rejected: [{ field: 'status', op: 'eq', value: 'REJECTED' }],
  all: [],
};
