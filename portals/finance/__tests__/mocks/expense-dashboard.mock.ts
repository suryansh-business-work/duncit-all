import type { MockedResponse } from '@apollo/client/testing';
import type { VarsMatcher } from './expense-config.mock';
import {
  EXPENSE_DASHBOARD,
  type ExpenseDashboardData,
  type ExpenseSlice,
} from '../../src/pages/finance/expense-dashboard-page/queries';

/**
 * Finance > Expenses > Dashboard: one `expenseDashboard(filter)` read, plus the
 * currency symbol, answers every tile and every breakdown bar.
 */
export type ExpenseSliceMock = { __typename: 'ExpenseBreakdownSlice' } & ExpenseSlice;

type Breakdowns = 'by_category' | 'by_related_type' | 'by_compensation_method';

export type ExpenseDashboardMock = { __typename: 'ExpenseDashboard' } & Omit<ExpenseDashboardData, Breakdowns> &
  Record<Breakdowns, ExpenseSliceMock[]>;

export const makeSlice = (key: string, total: number, count: number): ExpenseSliceMock => ({
  __typename: 'ExpenseBreakdownSlice',
  key,
  total,
  count,
});

/** The server sorts every breakdown biggest spend first; an empty key is unattributed. */
export const makeExpenseDashboard = (over: Partial<ExpenseDashboardMock> = {}): ExpenseDashboardMock => ({
  __typename: 'ExpenseDashboard',
  total_expenses: 12500,
  expense_count: 9,
  pending_count: 4,
  partial_count: 2,
  full_count: 2,
  rejected_count: 1,
  pending_total: 5000,
  partial_total: 3000,
  full_total: 3500,
  rejected_total: 1000,
  total_compensation_amount: 4800,
  pending_compensation_amount: 6700,
  current_month_total: 4200,
  previous_month_total: 8300,
  by_category: [makeSlice('RENT', 8000, 3), makeSlice('MARKETING', 4500, 6)],
  by_related_type: [makeSlice('VENUE', 7000, 4), makeSlice('', 5500, 5)],
  by_compensation_method: [],
  ...over,
});

export const expenseDashboardMock = (
  dashboard: ExpenseDashboardMock = makeExpenseDashboard(),
  match: VarsMatcher = () => true,
): MockedResponse => ({
  request: { query: EXPENSE_DASHBOARD, variables: match },
  result: {
    data: {
      expenseDashboard: dashboard,
      publicFinanceSettings: { __typename: 'PublicFinanceSettings', currency_symbol: '₹' },
    },
  },
  maxUsageCount: 50,
});
