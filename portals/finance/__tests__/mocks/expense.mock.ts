import type { MockedResponse } from '@apollo/client/testing';
import type { VarsMatcher } from './expense-config.mock';
import type { ExpenseRecord } from '../../src/pages/finance/expense-management-page/expense-form';
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
 * five expense mutations.
 *
 * Rows carry EVERY field `EXPENSE_FIELDS` selects. The generated
 * `@duncit/gql-types` Expense predates Related From and compensation, so the
 * shape is the portal's own `ExpenseRecord` minus the two fields the selection
 * leaves out (`expense_id`, a refund's `created_at`). A row missing a selected
 * field is written to the cache as a partial result and read back as nothing,
 * which is how the old suite ended up asserting on an empty screen.
 */
type ExpenseRefundRecord = ExpenseRecord['refunds'][number];

export type ExpenseRefundMock = { __typename: 'ExpenseRefund' } & Omit<
  ExpenseRefundRecord,
  'created_at'
>;

export type ExpenseMock = { __typename: 'Expense' } & Omit<ExpenseRecord, 'expense_id' | 'refunds'> & {
    refunds: ExpenseRefundMock[];
  };

export const makeExpenseRefund = (over: Partial<ExpenseRefundMock> = {}): ExpenseRefundMock => ({
  __typename: 'ExpenseRefund',
  refund_id: 'rf1',
  date: '2024-01-02T10:00:00.000Z',
  amount: 20,
  note: 'partial',
  ...over,
});

/** A general business cost: nobody attributed, nothing compensated yet. */
export const makeExpense = (over: Partial<ExpenseMock> = {}): ExpenseMock => ({
  __typename: 'Expense',
  id: 'e1',
  date: '2024-01-01T10:00:00.000Z',
  category: 'RENT',
  amount: 100,
  refund_total: 20,
  net_amount: 80,
  description: 'Office rent',
  vendor_name: 'Landlord',
  payment_method: 'BANK_TRANSFER',
  reference: 'ref-1',
  attachment_url: 'https://a/receipt.pdf',
  related_from_type: '',
  related_from_id: null,
  related_from_name: '',
  paid_by: '',
  compensation_status: 'PENDING',
  compensation_method: '',
  compensated_amount: 0,
  pending_compensation: 100,
  compensation_date: null,
  compensation_reference: '',
  refunds: [makeExpenseRefund()],
  created_at: '2024-01-01T10:00:00.000Z',
  ...over,
});

/** Everything optional left blank, as a quick cash entry is filed. */
export const emptyExpense = (): ExpenseMock =>
  makeExpense({
    id: 'e2',
    category: 'OTHER',
    amount: 50,
    refund_total: 0,
    net_amount: 50,
    description: '',
    vendor_name: '',
    payment_method: 'CASH',
    reference: '',
    attachment_url: '',
    pending_compensation: 50,
    refunds: [],
  });

/** Two refunds back, one of them recorded without a note. */
export const refundedExpense = (): ExpenseMock =>
  makeExpense({
    refund_total: 25,
    net_amount: 75,
    refunds: [
      makeExpenseRefund({ refund_id: 'rf1', amount: 20, note: 'partial' }),
      makeExpenseRefund({ refund_id: 'rf2', date: '2024-02-01T10:00:00.000Z', amount: 5, note: '' }),
    ],
  });

/** Spent on a venue and partly paid back by the person who fronted it. */
export const attributedExpense = (): ExpenseMock =>
  makeExpense({
    id: 'e3',
    description: 'Court hire',
    related_from_type: 'VENUE',
    related_from_id: 'ven-1',
    related_from_name: 'Smash Arena',
    paid_by: 'Asha',
    compensation_status: 'PARTIAL',
    compensation_method: 'VENDOR_REFUND',
    compensated_amount: 40,
    pending_compensation: 60,
    compensation_date: '2024-01-05T10:00:00.000Z',
    compensation_reference: 'cmp-1',
    refunds: [],
    refund_total: 0,
    net_amount: 100,
  });

/**
 * Filed under a Related From type with no entity behind it — the server keeps
 * the type and stores an empty name when no valid id came with it.
 */
export const typeOnlyExpense = (): ExpenseMock =>
  makeExpense({
    id: 'e4',
    description: 'Pod snacks',
    related_from_type: 'POD',
    related_from_id: null,
    related_from_name: '',
    compensation_status: 'REJECTED',
    refunds: [],
    refund_total: 0,
    net_amount: 100,
  });

/* ---- Summary ---- */

interface SummaryMock {
  __typename: 'ExpenseSummary';
  total: number;
  gross_total: number;
  refund_total: number;
  count: number;
  by_category: { __typename: 'ExpenseCategoryTotal'; category: string; total: number }[];
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
  summary: SummaryMock = makeExpenseSummary(),
  maxUsageCount = 50,
  delay = 0,
): MockedResponse => ({
  request: { query: EXPENSE_SUMMARY, variables: () => true },
  result: { data: { expenseSummary: summary } },
  maxUsageCount,
  delay,
});

export const expenseSummaryErrorMock = (): MockedResponse => ({
  request: { query: EXPENSE_SUMMARY, variables: () => true },
  error: new Error('summary refresh failed'),
  maxUsageCount: 50,
});

export const expensesTableMock = (rows: ExpenseMock[]): MockedResponse => ({
  request: { query: EXPENSES_TABLE, variables: () => true },
  result: { data: { expensesTable: { __typename: 'ExpenseTablePage', rows, total: rows.length } } },
  maxUsageCount: 50,
});

/* ---- Mutations ---- */

/** Optional matcher so a test can read the variables a mutation was sent with. */
const anyVars: VarsMatcher = () => true;

export const createExpenseMock = (
  over: { fail?: boolean; delay?: number; match?: VarsMatcher } = {},
): MockedResponse => ({
  request: { query: CREATE_EXPENSE, variables: over.match ?? anyVars },
  ...(over.delay ? { delay: over.delay } : {}),
  ...(over.fail
    ? { error: new Error('create failed') }
    : { result: { data: { createExpense: makeExpense() } } }),
  maxUsageCount: 20,
});

export const updateExpenseMock = (match: VarsMatcher = anyVars): MockedResponse => ({
  request: { query: UPDATE_EXPENSE, variables: match },
  result: { data: { updateExpense: makeExpense() } },
  maxUsageCount: 20,
});

export const deleteExpenseMock = (over: { fail?: boolean } = {}): MockedResponse => ({
  request: { query: DELETE_EXPENSE, variables: () => true },
  ...(over.fail
    ? { error: new Error('Expense not found') }
    : { result: { data: { deleteExpense: true } } }),
  maxUsageCount: 20,
});

export const addRefundMock = (
  expense: ExpenseMock | null = makeExpense({ net_amount: 60 }),
  match: VarsMatcher = anyVars,
): MockedResponse => ({
  request: { query: ADD_REFUND, variables: match },
  result: { data: { addExpenseRefund: expense } },
  maxUsageCount: 20,
});

export const removeRefundMock = (
  expense: ExpenseMock | null = makeExpense({ net_amount: 100 }),
): MockedResponse => ({
  request: { query: REMOVE_REFUND, variables: () => true },
  result: { data: { removeExpenseRefund: expense } },
  maxUsageCount: 20,
});
