import type { MockedResponse } from '@apollo/client/testing';
import {
  EXPENSE_OPTIONS,
  EXPENSE_RELATED_ENTITIES,
  EXPENSE_RELATED_ENTITY,
  type ExpenseOption,
  type ExpenseOptionKind,
  type ExpenseRelatedEntity,
} from '../../src/pages/finance/expense-config';

/**
 * The configured Expense dropdowns and the entity picker behind "Expense
 * Related From".
 *
 * Every Expense screen reads its categories, payment methods, Related From
 * types and compensation methods from `expenseOptions(kind)`, so a suite that
 * renders one without these mocks sees empty, disabled selects — the exact
 * drift that took the old Expense suite down. Shapes follow the queries'
 * selections, field for field.
 */
export type ExpenseOptionMock = { __typename: 'ExpenseOption' } & ExpenseOption;
export type ExpenseRelatedEntityMock = { __typename: 'ExpenseRelatedEntity' } & ExpenseRelatedEntity;

export const makeExpenseOption = (over: Partial<ExpenseOptionMock> = {}): ExpenseOptionMock => ({
  __typename: 'ExpenseOption',
  id: 'opt-rent',
  key: 'RENT',
  label: 'Rent',
  entity_source: '',
  ...over,
});

const option = (id: string, key: string, label: string, entity_source = '') =>
  makeExpenseOption({ id, key, label, entity_source });

/** What Finance > Settings > Expense Settings ships with, per list. */
export const EXPENSE_OPTION_FIXTURES: Readonly<Record<ExpenseOptionKind, ExpenseOptionMock[]>> = {
  CATEGORY: [
    option('opt-rent', 'RENT', 'Rent'),
    option('opt-marketing', 'MARKETING', 'Marketing'),
    option('opt-other', 'OTHER', 'Other'),
  ],
  PAYMENT_METHOD: [
    option('opt-bank', 'BANK_TRANSFER', 'Bank transfer'),
    option('opt-upi', 'UPI', 'UPI'),
    option('opt-cash', 'CASH', 'Cash'),
  ],
  RELATED_FROM_TYPE: [
    option('opt-venue', 'VENUE', 'Venue', 'VENUE'),
    option('opt-pod', 'POD', 'Pod', 'POD'),
  ],
  COMPENSATION_METHOD: [
    option('opt-vendor', 'VENDOR_REFUND', 'Vendor refund'),
    option('opt-host', 'HOST_DEDUCTION', 'Deducted from host payout'),
  ],
};

export const expenseOptionsMock = (
  kind: ExpenseOptionKind,
  options: ExpenseOptionMock[] = EXPENSE_OPTION_FIXTURES[kind],
): MockedResponse => ({
  request: { query: EXPENSE_OPTIONS, variables: { kind } },
  result: { data: { expenseOptions: options } },
  maxUsageCount: 50,
});

/** All four lists, as every Expense screen needs them. */
export const allExpenseOptionsMocks = (): MockedResponse[] => [
  expenseOptionsMock('CATEGORY'),
  expenseOptionsMock('PAYMENT_METHOD'),
  expenseOptionsMock('RELATED_FROM_TYPE'),
  expenseOptionsMock('COMPENSATION_METHOD'),
];

/* ---- Related entities ---- */

export const makeRelatedEntity = (
  over: Partial<ExpenseRelatedEntityMock> = {},
): ExpenseRelatedEntityMock => ({
  __typename: 'ExpenseRelatedEntity',
  id: 'ven-1',
  name: 'Smash Arena',
  reference: 'VEN-000001',
  ...over,
});

/** The venues the Related entity picker lists for type VENUE. */
export const VENUE_ENTITIES: ExpenseRelatedEntityMock[] = [
  makeRelatedEntity(),
  // A venue saved with no name yet reads as its reference.
  makeRelatedEntity({ id: 'ven-2', name: '', reference: 'VEN-000002' }),
  // Neither field filled in: the id is all the picker has left to show.
  makeRelatedEntity({ id: 'ven-3', name: '', reference: '' }),
];

/** What a variable matcher receives — Apollo types it as a plain record. */
type MockVars = Record<string, unknown>;

/**
 * A `request.variables` matcher. The Expense mocks take one so a test can read
 * the exact variables a mutation or query was sent with (`vi.fn<VarsMatcher>`).
 */
export type VarsMatcher = (vars: MockVars) => boolean;

/**
 * One type's search. `search` pins the term the picker must send; leave it
 * out to answer every term — the picker re-searches with the chosen name the
 * moment a value is picked, so a strict mock would only add noise.
 */
export const relatedEntitiesMock = (
  typeKey: string,
  rows: ExpenseRelatedEntityMock[] = VENUE_ENTITIES,
  search?: string | null,
): MockedResponse => ({
  request: {
    query: EXPENSE_RELATED_ENTITIES,
    variables: (vars: MockVars) =>
      vars.type_key === typeKey && (search === undefined || vars.search === search),
  },
  result: { data: { expenseRelatedEntities: rows } },
  maxUsageCount: 50,
});

/** The re-read of one saved entity (`expenseRelatedEntity`). */
export const relatedEntityMock = (
  entity: ExpenseRelatedEntityMock | null,
  entityId = entity?.id ?? 'ven-missing',
): MockedResponse => ({
  request: {
    query: EXPENSE_RELATED_ENTITY,
    variables: (vars: MockVars) => vars.entity_id === entityId,
  },
  result: { data: { expenseRelatedEntity: entity } },
  maxUsageCount: 50,
});
