import type { MockedResponse } from '@apollo/client/testing';
import type { Expense, ExpenseRefund } from '@duncit/gql-types';
import {
  ADD_REFUND,
  CREATE_EXPENSE,
  DELETE_EXPENSE,
  EXPENSES_TABLE,
  EXPENSE_SUMMARY,
  REMOVE_REFUND,
  UPDATE_EXPENSE,
} from '../../src/pages/finance/expense-management-page/queries';

/**
 * Expense-management mocks. Table rows are fetched imperatively
 * (`client.query(EXPENSES_TABLE)`); the summary chips come from
 * `useQuery(EXPENSE_SUMMARY)`; create/update/delete/refund flow through the
 * five expense mutations. Rows are a schema-synced `Pick` of `Expense`.
 */
export type ExpenseRefundMock = { __typename?: 'ExpenseRefund' } & Pick<
  ExpenseRefund,
  'refund_id' | 'date' | 'amount' | 'note'
>;

export const makeExpenseRefund = (over: Partial<ExpenseRefundMock> = {}): ExpenseRefundMock => ({
  __typename: 'ExpenseRefund',
  refund_id: 'rf1',
  date: '2024-01-02',
  amount: 20,
  note: 'partial',
  ...over,
});

export type ExpenseMock = { __typename?: 'Expense' } & Pick<
  Expense,
  | 'id'
  | 'date'
  | 'category'
  | 'amount'
  | 'refund_total'
  | 'net_amount'
  | 'description'
  | 'vendor_name'
  | 'payment_method'
  | 'reference'
  | 'attachment_url'
  | 'created_at'
> & { refunds: ExpenseRefundMock[] | null };

export const makeExpense = (over: Partial<ExpenseMock> = {}): ExpenseMock => ({
  __typename: 'Expense',
  id: 'e1',
  date: '2024-01-01',
  category: 'RENT',
  amount: 100,
  refund_total: 20,
  net_amount: 80,
  description: 'Office rent',
  vendor_name: 'Landlord',
  payment_method: 'BANK_TRANSFER',
  reference: 'ref-1',
  attachment_url: 'https://a/receipt.pdf',
  refunds: [makeExpenseRefund()],
  created_at: '2024-01-01',
  ...over,
});

export const emptyExpense = (): ExpenseMock =>
  makeExpense({
    id: 'e2',
    date: 'bad-date',
    category: 'OTHER',
    amount: 50,
    refund_total: 0,
    net_amount: 50,
    description: '',
    vendor_name: '',
    payment_method: 'CASH',
    reference: '',
    attachment_url: '',
    refunds: [],
  });

export const refundedExpense = (): ExpenseMock =>
  makeExpense({
    refunds: [
      makeExpenseRefund({ refund_id: 'rf1', date: 'bad-date', amount: 20, note: 'partial' }),
      makeExpenseRefund({ refund_id: 'rf2', date: '2024-02-01', amount: 5, note: '' }),
    ],
  });

/* ---- Summary ---- */

interface SummaryMock {
  __typename?: 'ExpenseSummary';
  total: number;
  gross_total: number;
  refund_total: number;
  count: number;
  by_category: { __typename?: 'ExpenseCategoryTotal'; category: string; total: number }[];
}

export const makeExpenseSummary = (over: Partial<SummaryMock> = {}): SummaryMock => ({
  __typename: 'ExpenseSummary',
  total: 80,
  gross_total: 100,
  refund_total: 20,
  count: 1,
  by_category: [{ __typename: 'ExpenseCategoryTotal', category: 'RENT', total: 80 }],
  ...over,
});

export const expenseSummaryMock = (
  summary: SummaryMock | null = makeExpenseSummary(),
  maxUsageCount = 50,
): MockedResponse => ({
  request: { query: EXPENSE_SUMMARY },
  variableMatcher: () => true,
  result: { data: { expenseSummary: summary } },
  maxUsageCount,
});

export const expenseSummaryErrorMock = (): MockedResponse => ({
  request: { query: EXPENSE_SUMMARY },
  variableMatcher: () => true,
  error: new Error('summary refresh failed'),
  maxUsageCount: 50,
});

export const expensesTableMock = (rows: ExpenseMock[]): MockedResponse => ({
  request: { query: EXPENSES_TABLE },
  variableMatcher: () => true,
  result: { data: { expensesTable: { __typename: 'ExpenseTablePage', rows, total: rows.length } } },
  maxUsageCount: 50,
});

/* ---- Mutations ---- */

export const createExpenseMock = (over: { fail?: boolean; delay?: number } = {}): MockedResponse => ({
  request: { query: CREATE_EXPENSE },
  variableMatcher: () => true,
  ...(over.delay ? { delay: over.delay } : {}),
  ...(over.fail
    ? { error: new Error('create failed') }
    : { result: { data: { createExpense: makeExpense() } } }),
  maxUsageCount: 20,
});

export const updateExpenseMock = (): MockedResponse => ({
  request: { query: UPDATE_EXPENSE },
  variableMatcher: () => true,
  result: { data: { updateExpense: makeExpense() } },
  maxUsageCount: 20,
});

export const deleteExpenseMock = (): MockedResponse => ({
  request: { query: DELETE_EXPENSE },
  variableMatcher: () => true,
  result: { data: { deleteExpense: true } },
  maxUsageCount: 20,
});

export const addRefundMock = (expense: ExpenseMock | null = makeExpense({ net_amount: 60 })): MockedResponse => ({
  request: { query: ADD_REFUND },
  variableMatcher: () => true,
  result: { data: { addExpenseRefund: expense } },
  maxUsageCount: 20,
});

export const removeRefundMock = (
  expense: ExpenseMock | null = makeExpense({ net_amount: 100 }),
): MockedResponse => ({
  request: { query: REMOVE_REFUND },
  variableMatcher: () => true,
  result: { data: { removeExpenseRefund: expense } },
  maxUsageCount: 20,
});
