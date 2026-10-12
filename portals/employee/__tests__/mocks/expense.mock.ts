import type { MockedResponse } from '@apollo/client/testing';
import type { EmployeeExpense } from '@duncit/gql-types';
import {
  CREATE_EXPENSE_CLAIM,
  DELETE_EXPENSE_CLAIM,
  EXPENSE_CURRENCY,
  MY_EXPENSE_CLAIM,
  MY_EXPENSE_SUMMARY,
  MY_EXPENSES_TABLE,
  UPDATE_EXPENSE_CLAIM,
} from '../../src/pages/expenses/queries';

/**
 * Employee-expense mocks: the claims an employee has filed, their totals, the
 * currency symbol and the create / update / withdraw mutations. Typed from the
 * generated schema (the fields `EMPLOYEE_EXPENSE_SELECTION` reads) and carrying
 * `__typename`.
 */
const ISO = '2026-03-04T09:30:00.000Z';

export type ExpenseClaimMock = Pick<
  EmployeeExpense,
  | 'id'
  | 'claim_id'
  | 'employee_id'
  | 'employee_name'
  | 'employee_email'
  | 'date'
  | 'category'
  | 'amount'
  | 'description'
  | 'merchant'
  | 'payment_method'
  | 'reference'
  | 'bill_number'
  | 'bill_url'
  | 'reviewed_at'
  | 'review_note'
  | 'created_at'
> & { __typename: 'EmployeeExpense'; status: 'PENDING' | 'APPROVED' | 'REJECTED' };

export const makeExpenseClaim = (over: Partial<ExpenseClaimMock> = {}): ExpenseClaimMock => ({
  __typename: 'EmployeeExpense',
  id: 'exp-1',
  claim_id: 'EXP-000101',
  employee_id: 'emp-1',
  employee_name: 'Asha Rao',
  employee_email: 'asha@duncit.com',
  date: ISO,
  category: 'TRAVEL',
  amount: 1200,
  description: 'Cab to the venue visit',
  merchant: 'Uber',
  payment_method: 'UPI',
  reference: 'UTR998877',
  bill_number: 'INV-77',
  bill_url: 'https://ik.imagekit.io/duncit/employee-expenses/inv-77.pdf',
  status: 'PENDING',
  reviewed_at: null,
  review_note: '',
  created_at: ISO,
  ...over,
});

/** The claims table; every request's variables are pushed onto `seen`. */
export const myExpensesTableMock = (
  rows: ExpenseClaimMock[] = [makeExpenseClaim()],
  seen: Array<Record<string, unknown>> = [],
): MockedResponse => ({
  request: { query: MY_EXPENSES_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: (variables) => {
    seen.push(variables as Record<string, unknown>);
    return {
      data: {
        myEmployeeExpensesTable: {
          __typename: 'EmployeeExpenseTablePage',
          total: rows.length,
          rows,
        },
      },
    };
  },
});

export interface ExpenseSummaryMock {
  claimed_total: number;
  pending_total: number;
  approved_total: number;
  rejected_total: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  claim_count: number;
  employee_count: number;
}

export const makeExpenseSummary = (over: Partial<ExpenseSummaryMock> = {}): ExpenseSummaryMock => ({
  claimed_total: 5000,
  pending_total: 1200,
  approved_total: 3000,
  rejected_total: 800,
  pending_count: 1,
  approved_count: 2,
  rejected_count: 1,
  claim_count: 4,
  employee_count: 1,
  ...over,
});

/** The tiles' query. Pass `usage` to answer a refetch more than once. */
export const expenseSummaryMock = (
  summary: ExpenseSummaryMock = makeExpenseSummary(),
  currency = '₹',
): MockedResponse => ({
  request: { query: MY_EXPENSE_SUMMARY },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      myEmployeeExpenseSummary: { __typename: 'EmployeeExpenseTotals', ...summary },
      publicFinanceSettings: { __typename: 'PublicFinanceSettings', currency_symbol: currency },
    },
  },
});

export const expenseCurrencyMock = (currency = '₹'): MockedResponse => ({
  request: { query: EXPENSE_CURRENCY },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: { publicFinanceSettings: { __typename: 'PublicFinanceSettings', currency_symbol: currency } },
  },
});

export const myExpenseMock = (claim: ExpenseClaimMock | null, id = 'exp-1'): MockedResponse => ({
  request: { query: MY_EXPENSE_CLAIM, variables: { expense_doc_id: id } },
  result: { data: { myEmployeeExpense: claim } },
});

export const myExpenseErrorMock = (message: string, id = 'exp-1'): MockedResponse => ({
  request: { query: MY_EXPENSE_CLAIM, variables: { expense_doc_id: id } },
  result: { errors: [{ message }] },
});

type Matches = (variables: Record<string, unknown>) => boolean;

export const createExpenseMock = (matches: Matches = () => true, fail?: string): MockedResponse => ({
  request: { query: CREATE_EXPENSE_CLAIM, variables: matches },
  result:
    fail === undefined
      ? { data: { createEmployeeExpense: makeExpenseClaim() } }
      : { errors: [{ message: fail }] },
});

export const updateExpenseMock = (matches: Matches = () => true, fail?: string): MockedResponse => ({
  request: { query: UPDATE_EXPENSE_CLAIM, variables: matches },
  result:
    fail === undefined
      ? { data: { updateEmployeeExpense: makeExpenseClaim() } }
      : { errors: [{ message: fail }] },
});

export const deleteExpenseMock = (id = 'exp-1', fail?: string): MockedResponse => ({
  request: { query: DELETE_EXPENSE_CLAIM, variables: { expense_doc_id: id } },
  result:
    fail === undefined
      ? { data: { deleteEmployeeExpense: true } }
      : { errors: [{ message: fail }] },
});
