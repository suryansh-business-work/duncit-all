import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import type { PodExpense, PodExpensePodRow, PodExpenseSummary } from '@duncit/gql-types';
import {
  CREATE_POD_EXPENSE,
  DELETE_POD_EXPENSE,
  POD_EXPENSE_POD_SUMMARY,
  POD_EXPENSE_SUMMARY,
  UPDATE_POD_EXPENSE,
} from '../../src/pages/finance/pod-expense-page/queries';

/**
 * Pod Expenses mocks.
 *
 * Both tables on this screen are fetched imperatively through the shared table
 * engine, so only four operations reach Apollo: the page's KPI summary, the
 * drawer header's per-pod read, and the three write mutations. Rows are a
 * schema-synced `Pick`, so a field renamed on the server fails typecheck here
 * rather than passing a stale shape into the component under test.
 */
export type PodExpensePodRowMock = { __typename?: 'PodExpensePodRow' } & Pick<
  PodExpensePodRow,
  | 'pod_doc_id'
  | 'pod_code'
  | 'pod_title'
  | 'pod_date_time'
  | 'pod_status'
  | 'expense_total'
  | 'expense_count'
  | 'bill_count'
  | 'last_expense_at'
>;

export const makePodExpensePodRow = (
  over: Partial<PodExpensePodRowMock> = {},
): PodExpensePodRowMock => ({
  __typename: 'PodExpensePodRow',
  pod_doc_id: '65b000000000000000000001',
  pod_code: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton',
  pod_date_time: '2026-08-20T10:00:00.000Z',
  pod_status: 'COMPLETED',
  expense_total: 2500,
  expense_count: 3,
  bill_count: 2,
  last_expense_at: '2026-08-21T09:00:00.000Z',
  ...over,
});

/** A pod nobody has spent anything on yet — still a row, because it is the row you click. */
export const untouchedPodRow = (): PodExpensePodRowMock =>
  makePodExpensePodRow({
    pod_doc_id: '65b000000000000000000009',
    pod_code: 'DUN-POD-4822',
    pod_title: 'Friday Football',
    pod_status: 'UPCOMING',
    expense_total: 0,
    expense_count: 0,
    bill_count: 0,
    last_expense_at: null,
  });

export type PodExpenseMock = { __typename?: 'PodExpense' } & Pick<
  PodExpense,
  | 'id'
  | 'expense_id'
  | 'pod_id'
  | 'date'
  | 'category'
  | 'amount'
  | 'description'
  | 'vendor_name'
  | 'payment_method'
  | 'reference'
  | 'bill_number'
  | 'bill_url'
  | 'created_at'
>;

export const makePodExpense = (over: Partial<PodExpenseMock> = {}): PodExpenseMock => ({
  __typename: 'PodExpense',
  id: '65b000000000000000000101',
  expense_id: 'pex_abc123',
  pod_id: '65b000000000000000000001',
  date: '2026-08-20T00:00:00.000Z',
  category: 'VENUE_RENT',
  amount: 2000,
  description: 'Court booking',
  vendor_name: 'Smash Arena',
  payment_method: 'UPI',
  reference: 'txn-99',
  bill_number: 'INV-14',
  bill_url: 'https://img.duncit.com/bill.pdf',
  created_at: '2026-08-20T05:00:00.000Z',
  ...over,
});

/** A bill was uploaded, but nobody typed its number — the link says "View bill". */
export const unnumberedBillExpense = (): PodExpenseMock =>
  makePodExpense({
    id: '65b000000000000000000102',
    category: 'REFRESHMENTS',
    amount: 400,
    description: '',
    vendor_name: '',
    payment_method: 'CASH',
    bill_number: '',
    bill_url: 'https://img.duncit.com/chai.jpg',
  });

/** Spend recorded on the day, with the supplier's invoice still to come. */
export const billlessExpense = (): PodExpenseMock =>
  makePodExpense({
    id: '65b000000000000000000103',
    category: 'TRANSPORT',
    amount: 100,
    description: 'Cab for the kit',
    vendor_name: 'Namma Cabs',
    bill_number: '',
    bill_url: '',
  });

export type PodExpenseSummaryMock = { __typename?: 'PodExpenseSummary' } & Pick<
  PodExpenseSummary,
  | 'total_spent'
  | 'this_month_spent'
  | 'expense_count'
  | 'pods_covered'
  | 'bill_count'
  | 'missing_bill_count'
> & {
    by_category: { __typename?: 'PodExpenseCategoryTotal'; category: string; total: number }[];
  };

export const makePodExpenseSummary = (
  over: Partial<PodExpenseSummaryMock> = {},
): PodExpenseSummaryMock => ({
  __typename: 'PodExpenseSummary',
  total_spent: 2500,
  this_month_spent: 900,
  expense_count: 3,
  pods_covered: 1,
  bill_count: 2,
  missing_bill_count: 1,
  by_category: [
    { __typename: 'PodExpenseCategoryTotal', category: 'VENUE_RENT', total: 2000 },
    { __typename: 'PodExpenseCategoryTotal', category: 'REFRESHMENTS', total: 500 },
  ],
  ...over,
});

/** Every bill is in and there is nothing to split — the category card is absent. */
export const settledPodExpenseSummary = (): PodExpenseSummaryMock =>
  makePodExpenseSummary({ missing_bill_count: 0, bill_count: 3, by_category: [] });

export const podExpenseSummaryMock = (
  summary: PodExpenseSummaryMock = makePodExpenseSummary(),
  currencySymbol = '₹',
  maxUsageCount = 50,
): MockedResponse => ({
  request: { query: POD_EXPENSE_SUMMARY, variables: () => true },
  result: {
    data: {
      podExpenseSummary: summary,
      publicFinanceSettings: {
        __typename: 'PublicFinanceSettings',
        currency_symbol: currencySymbol,
      },
    },
  },
  maxUsageCount,
});

export const podExpenseSummaryErrorMock = (): MockedResponse => ({
  request: { query: POD_EXPENSE_SUMMARY, variables: () => true },
  error: new Error('summary refresh failed'),
  maxUsageCount: 50,
});

export const podExpensePodSummaryMock = (
  pod: PodExpensePodRowMock | null = makePodExpensePodRow(),
): MockedResponse => ({
  request: { query: POD_EXPENSE_POD_SUMMARY, variables: () => true },
  result: { data: { podExpensePodSummary: pod } },
  maxUsageCount: 50,
});

/**
 * A refused write is a GraphQL error, not a network one.
 *
 * The server rejects these with a `GraphQLError`, and `parseApiError` reads the
 * two cases differently — a network failure collapses to "Network error. Please
 * try again." A mock that failed the wrong way would assert copy no reader ever
 * sees.
 */
export const createPodExpenseMock = (fail = false): MockedResponse => ({
  request: { query: CREATE_POD_EXPENSE, variables: () => true },
  result: fail
    ? { errors: [new GraphQLError('Expense amount must be greater than 0')] }
    : { data: { createPodExpense: makePodExpense() } },
  maxUsageCount: 20,
});

export const updatePodExpenseMock = (): MockedResponse => ({
  request: { query: UPDATE_POD_EXPENSE, variables: () => true },
  result: { data: { updatePodExpense: makePodExpense({ amount: 2100 }) } },
  maxUsageCount: 20,
});

export const deletePodExpenseMock = (fail = false): MockedResponse => ({
  request: { query: DELETE_POD_EXPENSE, variables: () => true },
  result: fail
    ? { errors: [new GraphQLError('Pod expense not found')] }
    : { data: { deletePodExpense: true } },
  maxUsageCount: 20,
});
