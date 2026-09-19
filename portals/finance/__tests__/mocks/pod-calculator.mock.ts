import { GraphQLError, type DocumentNode } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import type { PodExpense } from '../../src/pages/calculators/pod-profit/types';
import type { SavedPodCalculator } from '../../src/pages/calculators/pod-profit/saved/types';
import { POD_CALCULATOR_DEFAULTS } from '../../src/pages/calculators/pod-profit/useCalculatorDefaults';
import {
  CREATE_POD_CALCULATOR,
  DELETE_POD_CALCULATOR,
  EMAIL_POD_CALCULATOR,
  POD_CALCULATOR_PDF,
  POD_CALCULATORS,
  UPDATE_POD_CALCULATOR,
} from '../../src/pages/calculators/pod-profit/saved/queries';

/**
 * Pod Profit Calculator mocks.
 *
 * `PodCalculator` is not in the generated `@duncit/gql-types` yet, so the
 * shapes are the client's own `SavedPodCalculator` plus the `__typename` the
 * server attaches — every field `CALCULATOR_FIELDS` selects is present, so
 * Apollo writes the result whole instead of logging a missing field.
 */
export type ExpenseMock = PodExpense & { __typename: 'PodCalculatorExpense' };

export type PodMock = Omit<SavedPodCalculator['pods'][number], 'expenses'> & {
  __typename: 'PodCalculatorPod';
  expenses: ExpenseMock[];
};

export type CalculatorMock = Omit<SavedPodCalculator, 'pods'> & {
  __typename: 'PodCalculator';
  pods: PodMock[];
};

export const makeExpense = (over: Partial<ExpenseMock> = {}): ExpenseMock => ({
  __typename: 'PodCalculatorExpense',
  expense_key: 'exp-refreshments',
  label: 'Refreshments',
  amount: 600,
  borne_by: 'DUNCIT',
  ...over,
});

/** The shipped defaults: ₹1,000 × 30 spots, ₹400 venue slot, 18/5/10/10/3 %. */
export const makePod = (over: Partial<PodMock> = {}): PodMock => ({
  __typename: 'PodCalculatorPod',
  pod_key: 'pod-sunday-football',
  name: 'Sunday Turf Football',
  pod_amount: 1000,
  no_of_spots: 30,
  pod_count: 1,
  gst_percent: 18,
  platform_fee_percent: 5,
  venue_amount: 400,
  host_commission_percent: 10,
  venue_commission_percent: 10,
  club_admin_percent: 3,
  expenses: [],
  ...over,
});

export const makeCalculator = (over: Partial<CalculatorMock> = {}): CalculatorMock => ({
  __typename: 'PodCalculator',
  id: '66f1a2b3c4d5e6f708192a01',
  name: 'Diwali weekend',
  kind: 'SINGLE',
  updated_at: '2026-09-01T10:00:00.000Z',
  pods: [makePod()],
  ...over,
});

/** Finance > Default Deductions as the calculator reads it. */
export const calculatorDefaultsMock = (): MockedResponse => ({
  request: { query: POD_CALCULATOR_DEFAULTS },
  result: {
    data: {
      financeSettings: {
        __typename: 'FinanceSettings',
        gst_pct: 18,
        platform_fee_pct: 5,
        default_host_commission_pct: 10,
        default_venue_commission_pct: 10,
        default_club_admin_pct: 3,
      },
    },
  },
  maxUsageCount: 10,
});

/**
 * One answer to the saved-calculations list. A test that saves or deletes
 * lines up one of these per fetch (mount, then each refetch), in order.
 */
export const podCalculatorsMock = (
  kind: 'SINGLE' | 'MULTI',
  rows: CalculatorMock[],
): MockedResponse => ({
  request: { query: POD_CALCULATORS, variables: { kind } },
  result: { data: { podCalculators: rows } },
});

/** A list read that never reached the server. */
export const podCalculatorsErrorMock = (kind: 'SINGLE' | 'MULTI', message: string): MockedResponse => ({
  request: { query: POD_CALCULATORS, variables: { kind } },
  error: new Error(message),
});

interface WriteOptions {
  /** The server's refusal, returned as a GraphQL error. */
  fail?: string;
  /** Holds the answer back so the in-flight state can be seen. */
  delay?: number;
}

const write = (query: DocumentNode, data: Record<string, unknown>, over: WriteOptions): MockedResponse => ({
  request: { query, variables: () => true },
  ...(over.delay ? { delay: over.delay } : {}),
  result: over.fail ? { errors: [new GraphQLError(over.fail)] } : { data },
});

export const createPodCalculatorMock = (created: CalculatorMock, over: WriteOptions = {}): MockedResponse =>
  write(CREATE_POD_CALCULATOR, { createPodCalculator: created }, over);

export const updatePodCalculatorMock = (updated: CalculatorMock, over: WriteOptions = {}): MockedResponse =>
  write(UPDATE_POD_CALCULATOR, { updatePodCalculator: updated }, over);

export const deletePodCalculatorMock = (over: WriteOptions = {}): MockedResponse =>
  write(DELETE_POD_CALCULATOR, { deletePodCalculator: true }, over);

export const emailPodCalculatorMock = (over: WriteOptions = {}): MockedResponse =>
  write(EMAIL_POD_CALCULATOR, { emailPodCalculator: true }, over);

/** `%PDF-1.4` plus a newline, base64-encoded — the head of every rendered report. */
export const PDF_BASE64 = 'JVBERi0xLjQK';

export const podCalculatorPdfMock = (calculatorId: string, over: WriteOptions = {}): MockedResponse => ({
  request: { query: POD_CALCULATOR_PDF, variables: { calculator_doc_id: calculatorId } },
  ...(over.delay ? { delay: over.delay } : {}),
  result: over.fail
    ? { errors: [new GraphQLError(over.fail)] }
    : { data: { podCalculatorPdfBase64: PDF_BASE64 } },
});
