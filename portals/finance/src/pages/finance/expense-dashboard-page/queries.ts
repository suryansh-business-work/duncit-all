import { gql } from '@apollo/client';

export const EXPENSE_DASHBOARD = gql`
  query ExpenseDashboard($filter: ExpenseFilterInput) {
    expenseDashboard(filter: $filter) {
      total_expenses
      expense_count
      pending_count
      partial_count
      full_count
      rejected_count
      pending_total
      partial_total
      full_total
      rejected_total
      total_compensation_amount
      pending_compensation_amount
      current_month_total
      previous_month_total
      by_category {
        key
        total
        count
      }
      by_related_type {
        key
        total
        count
      }
      by_compensation_method {
        key
        total
        count
      }
    }
    publicFinanceSettings {
      currency_symbol
    }
  }
`;

export interface ExpenseSlice {
  key: string;
  total: number;
  count: number;
}

export interface ExpenseDashboardData {
  total_expenses: number;
  expense_count: number;
  pending_count: number;
  partial_count: number;
  full_count: number;
  rejected_count: number;
  pending_total: number;
  partial_total: number;
  full_total: number;
  rejected_total: number;
  total_compensation_amount: number;
  pending_compensation_amount: number;
  current_month_total: number;
  previous_month_total: number;
  by_category: ExpenseSlice[];
  by_related_type: ExpenseSlice[];
  by_compensation_method: ExpenseSlice[];
}

/** Everything the filter bar can pin. Every value is a configured option key. */
export interface ExpenseDashboardFilter {
  from?: string | null;
  to?: string | null;
  category?: string | null;
  related_from_type?: string | null;
  related_from_id?: string | null;
  compensation_status?: string | null;
  compensation_method?: string | null;
  paid_by?: string | null;
}

export const EMPTY_FILTER: ExpenseDashboardFilter = {};

/**
 * Apollo variables from the filter bar.
 *
 * Blank fields are dropped rather than sent as '': the server treats an empty
 * string as "match the expenses whose category really is empty", which is a
 * different question from "don't filter on category".
 */
export function toFilterVariables(filter: ExpenseDashboardFilter) {
  const entries = Object.entries(filter).filter(([, value]) => value !== '' && value != null);
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}
