import { gql } from '@apollo/client';
import type { TableFilterValue } from '@duncit/table';

const POD_ROW_FIELDS = `
  pod_doc_id
  pod_code
  pod_title
  pod_date_time
  pod_status
  expense_total
  expense_count
  bill_count
  last_expense_at
`;

const EXPENSE_FIELDS = `
  id
  expense_id
  pod_id
  date
  category
  amount
  description
  vendor_name
  payment_method
  reference
  bill_number
  bill_url
  created_at
`;

export const POD_EXPENSE_PODS_TABLE = gql`
  query PodExpensePodsTable($query: TableQueryInput) {
    podExpensePodsTable(query: $query) {
      total
      rows {
        ${POD_ROW_FIELDS}
      }
    }
  }
`;

export const POD_EXPENSE_POD_SUMMARY = gql`
  query PodExpensePodSummary($pod_doc_id: ID!) {
    podExpensePodSummary(pod_doc_id: $pod_doc_id) {
      ${POD_ROW_FIELDS}
    }
  }
`;

export const POD_EXPENSES_TABLE = gql`
  query PodExpensesTable($pod_doc_id: ID!, $query: TableQueryInput) {
    podExpensesTable(pod_doc_id: $pod_doc_id, query: $query) {
      total
      rows {
        ${EXPENSE_FIELDS}
      }
    }
  }
`;

export const POD_EXPENSE_SUMMARY = gql`
  query PodExpenseSummary {
    podExpenseSummary {
      total_spent
      this_month_spent
      expense_count
      pods_covered
      bill_count
      missing_bill_count
      by_category {
        category
        total
      }
    }
    publicFinanceSettings {
      currency_symbol
    }
  }
`;

export const CREATE_POD_EXPENSE = gql`
  mutation CreatePodExpense($pod_doc_id: ID!, $input: PodExpenseInput!) {
    createPodExpense(pod_doc_id: $pod_doc_id, input: $input) {
      ${EXPENSE_FIELDS}
    }
  }
`;

export const UPDATE_POD_EXPENSE = gql`
  mutation UpdatePodExpense($expense_doc_id: ID!, $input: PodExpenseInput!) {
    updatePodExpense(expense_doc_id: $expense_doc_id, input: $input) {
      ${EXPENSE_FIELDS}
    }
  }
`;

export const DELETE_POD_EXPENSE = gql`
  mutation DeletePodExpense($expense_doc_id: ID!) {
    deletePodExpense(expense_doc_id: $expense_doc_id)
  }
`;

/** Mirrors POD_EXPENSE_CATEGORIES on the server; the server drops anything else. */
export const POD_EXPENSE_CATEGORIES = [
  'VENUE_RENT',
  'EQUIPMENT',
  'REFRESHMENTS',
  'TRANSPORT',
  'STAFF',
  'PHOTOGRAPHY',
  'MARKETING',
  'PRIZES',
  'MATERIALS',
  'PERMITS',
  'OTHER',
] as const;

/** The company ledger's list — one set of ways money leaves Duncit (rule 34). */
export { PAYMENT_METHODS as POD_EXPENSE_PAYMENT_METHODS, labelize } from '../expense-management-page/queries';

export type PodExpensePodStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface PodExpensePodRow {
  pod_doc_id: string;
  pod_code: string;
  pod_title: string;
  pod_date_time: string;
  pod_status: PodExpensePodStatus;
  expense_total: number;
  expense_count: number;
  bill_count: number;
  last_expense_at: string | null;
}

export interface PodExpenseRow {
  id: string;
  expense_id: string;
  pod_id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  vendor_name: string;
  payment_method: string;
  reference: string;
  bill_number: string;
  bill_url: string;
  created_at: string;
}

export interface PodExpenseSummaryData {
  total_spent: number;
  this_month_spent: number;
  expense_count: number;
  pods_covered: number;
  bill_count: number;
  missing_bill_count: number;
  by_category: Array<{ category: string; total: number }>;
}

/** The page's scope tabs. Each is a pinned filter on the rolled-up numbers. */
export type PodExpenseScope = 'all' | 'recorded' | 'missing-bills';

export const SCOPE_FILTERS: Readonly<Record<PodExpenseScope, readonly TableFilterValue[]>> = {
  all: [],
  recorded: [{ field: 'has_expenses', op: 'is_true' }],
  'missing-bills': [{ field: 'missing_bills', op: 'is_true' }],
};
