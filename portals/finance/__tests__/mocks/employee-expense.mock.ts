import type { MockedResponse } from '@apollo/client/testing';
import type { VarsMatcher } from './expense-config.mock';
import type { EmployeeExpenseClaim, EmployeeExpenseTotals } from '@duncit/utils';
import {
  EMPLOYEE_EXPENSE_SUMMARY,
  REVIEW_EMPLOYEE_EXPENSE,
} from '../../src/pages/finance/employee-expense-page/queries';

/**
 * Finance > Employee Expenses. The queue's rows reach the stubbed table
 * through `tableControls.rowsByKey.employeeExpensesTable`; the tiles and the
 * currency come from `employeeExpenseSummary`; a decision is one
 * `reviewEmployeeExpense` mutation. Shapes are the shared
 * `EMPLOYEE_EXPENSE_SELECTION` both consoles ask for.
 */
export type ClaimMock = { __typename: 'EmployeeExpense' } & EmployeeExpenseClaim;

export const makeClaim = (over: Partial<ClaimMock> = {}): ClaimMock => ({
  __typename: 'EmployeeExpense',
  id: 'claim-1',
  claim_id: 'DUN-EXP-4F2A19',
  employee_id: 'emp-1',
  employee_name: 'Asha Rao',
  employee_email: 'asha@duncit.com',
  date: '2026-08-12T10:00:00.000Z',
  category: 'TRAVEL',
  amount: 1240,
  description: 'Cab to the venue walk-through',
  merchant: 'Uber',
  payment_method: 'UPI',
  reference: 'UPI-778812',
  bill_number: 'INV-2291',
  bill_url: 'https://ik.imagekit.io/duncit/bills/inv-2291.pdf',
  status: 'PENDING',
  reviewed_at: null,
  review_note: '',
  created_at: '2026-08-12T11:00:00.000Z',
  ...over,
});

/** Filed with no bill yet, by an employee whose profile has no name. */
export const billlessClaim = (): ClaimMock =>
  makeClaim({
    id: 'claim-2',
    claim_id: 'DUN-EXP-77B0C1',
    employee_id: 'emp-2',
    employee_name: '',
    employee_email: 'ravi@duncit.com',
    category: 'MEALS',
    amount: 860,
    description: 'Team lunch after the league final',
    merchant: '',
    payment_method: 'CASH',
    reference: '',
    bill_number: '',
    bill_url: '',
  });

/** Approved with no note, its bill uploaded without a number. */
export const approvedClaim = (): ClaimMock =>
  makeClaim({
    id: 'claim-3',
    claim_id: 'DUN-EXP-19C2AA',
    description: '',
    bill_number: '',
    status: 'APPROVED',
    reviewed_at: '2026-08-14T09:30:00.000Z',
  });

export const rejectedClaim = (): ClaimMock =>
  makeClaim({
    id: 'claim-4',
    claim_id: 'DUN-EXP-5D0E3B',
    status: 'REJECTED',
    reviewed_at: '2026-08-15T09:30:00.000Z',
    review_note: 'Personal travel, not a Duncit trip',
  });

export type SummaryMock = { __typename: 'EmployeeExpenseSummary' } & EmployeeExpenseTotals;

export const makeEmployeeSummary = (over: Partial<SummaryMock> = {}): SummaryMock => ({
  __typename: 'EmployeeExpenseSummary',
  claimed_total: 9340,
  pending_total: 2100,
  approved_total: 5980,
  rejected_total: 1260,
  pending_count: 2,
  approved_count: 5,
  rejected_count: 1,
  claim_count: 8,
  employee_count: 3,
  ...over,
});

export const employeeSummaryMock = (
  summary: SummaryMock = makeEmployeeSummary(),
  maxUsageCount = 50,
): MockedResponse => ({
  request: { query: EMPLOYEE_EXPENSE_SUMMARY },
  result: {
    data: {
      employeeExpenseSummary: summary,
      publicFinanceSettings: { __typename: 'PublicFinanceSettings', currency_symbol: '₹' },
    },
  },
  maxUsageCount,
});

export const employeeSummaryErrorMock = (): MockedResponse => ({
  request: { query: EMPLOYEE_EXPENSE_SUMMARY },
  error: new Error('summary refresh failed'),
  maxUsageCount: 50,
});


export const reviewClaimMock = (
  over: { fail?: boolean; match?: VarsMatcher } = {},
): MockedResponse => ({
  request: { query: REVIEW_EMPLOYEE_EXPENSE, variables: over.match ?? (() => true) },
  ...(over.fail
    ? { error: new Error('This claim has already been decided') }
    : {
        result: {
          data: {
            reviewEmployeeExpense: makeClaim({ status: 'APPROVED', reviewed_at: '2026-08-18T10:00:00.000Z' }),
          },
        },
      }),
  maxUsageCount: 20,
});
