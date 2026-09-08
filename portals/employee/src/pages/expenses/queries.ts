import { gql } from '@apollo/client';
import { EMPLOYEE_EXPENSE_SELECTION } from '@duncit/utils';
import type { TableFilterValue } from '@duncit/table';

export const MY_EXPENSES_TABLE = gql`
  query MyEmployeeExpensesTable($query: TableQueryInput) {
    myEmployeeExpensesTable(query: $query) {
      total
      rows {
        ${EMPLOYEE_EXPENSE_SELECTION}
      }
    }
  }
`;

export const MY_EXPENSE_CLAIM = gql`
  query MyEmployeeExpense($expense_doc_id: ID!) {
    myEmployeeExpense(expense_doc_id: $expense_doc_id) {
      ${EMPLOYEE_EXPENSE_SELECTION}
    }
  }
`;

export const EXPENSE_CURRENCY = gql`
  query ExpenseClaimCurrency {
    publicFinanceSettings {
      currency_symbol
    }
  }
`;

export const MY_EXPENSE_SUMMARY = gql`
  query MyEmployeeExpenseSummary {
    myEmployeeExpenseSummary {
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

export const CREATE_EXPENSE_CLAIM = gql`
  mutation CreateEmployeeExpense($input: EmployeeExpenseInput!) {
    createEmployeeExpense(input: $input) {
      ${EMPLOYEE_EXPENSE_SELECTION}
    }
  }
`;

export const UPDATE_EXPENSE_CLAIM = gql`
  mutation UpdateEmployeeExpense($expense_doc_id: ID!, $input: EmployeeExpenseInput!) {
    updateEmployeeExpense(expense_doc_id: $expense_doc_id, input: $input) {
      ${EMPLOYEE_EXPENSE_SELECTION}
    }
  }
`;

export const DELETE_EXPENSE_CLAIM = gql`
  mutation DeleteEmployeeExpense($expense_doc_id: ID!) {
    deleteEmployeeExpense(expense_doc_id: $expense_doc_id)
  }
`;

/** CONSTANT_CASE code -> the words shown for it. */
export const labelize = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ');

/** The page's scope tabs. Each is a pinned status filter on the same list. */
export type ExpenseScope = 'all' | 'pending' | 'approved' | 'rejected';

export const SCOPE_FILTERS: Readonly<Record<ExpenseScope, readonly TableFilterValue[]>> = {
  all: [],
  pending: [{ field: 'status', op: 'eq', value: 'PENDING' }],
  approved: [{ field: 'status', op: 'eq', value: 'APPROVED' }],
  rejected: [{ field: 'status', op: 'eq', value: 'REJECTED' }],
};
