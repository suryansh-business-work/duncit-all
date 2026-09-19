import type { MockedResponse } from '@apollo/client/testing';
import type { VarsMatcher } from './expense-config.mock';
import {
  CREATE_EXPENSE_OPTION,
  DELETE_EXPENSE_OPTION,
  EXPENSE_OPTIONS_TABLE,
  UPDATE_EXPENSE_OPTION,
  type ExpenseOptionKind,
  type ExpenseOptionRow,
} from '../../src/pages/finance/expense-config';

/**
 * Finance > Settings > Expense Settings: one `expenseOptionsTable(kind)` read
 * per tab (with the entity sources the Related From form offers), and the
 * three option mutations.
 *
 * The settings read COUNTS usage; the create/update answers do not (the server
 * returns the bare option), so a written row comes back with `usage_count:
 * null` — exactly what the Apollo cache then shows in the table until the
 * page's refetch lands.
 */
export type ExpenseOptionRowMock = { __typename: 'ExpenseOption' } & ExpenseOptionRow;

export const makeOptionRow = (over: Partial<ExpenseOptionRowMock> = {}): ExpenseOptionRowMock => ({
  __typename: 'ExpenseOption',
  id: 'opt-venue',
  kind: 'RELATED_FROM_TYPE',
  key: 'VENUE',
  label: 'Venue',
  entity_source: 'VENUE',
  sort_order: 0,
  is_active: true,
  is_system: true,
  usage_count: 12,
  ...over,
});

/** Built-in and in use, custom and unused (switched off, no entity list). */
export const relatedTypeRows = (): ExpenseOptionRowMock[] => [
  makeOptionRow(),
  makeOptionRow({
    id: 'opt-partner',
    key: 'EVENT_PARTNER',
    label: 'Event partner',
    entity_source: '',
    sort_order: 1,
    is_active: false,
    is_system: false,
    usage_count: 0,
  }),
];

export const ENTITY_SOURCES = ['POD', 'CLUB', 'VENUE', 'CLUB_ADMIN', 'HOST'];

export const optionsTableMock = (
  kind: ExpenseOptionKind,
  rows: ExpenseOptionRowMock[] = relatedTypeRows(),
  match: VarsMatcher = () => true,
): MockedResponse => ({
  request: {
    query: EXPENSE_OPTIONS_TABLE,
    variables: (vars: Record<string, unknown>) => vars.kind === kind && match(vars),
  },
  result: { data: { expenseOptionsTable: rows, expenseEntitySources: ENTITY_SOURCES } },
  maxUsageCount: 50,
});

export const optionsTableErrorMock = (match: VarsMatcher): MockedResponse => ({
  request: { query: EXPENSE_OPTIONS_TABLE, variables: match },
  error: new Error('Could not reload the list'),
  maxUsageCount: 50,
});

/** The server's answer to a write: the bare option, usage not counted. */
const written = (over: Partial<ExpenseOptionRowMock>) => makeOptionRow({ usage_count: null, ...over });

export const createOptionMock = (
  over: { fail?: boolean; match?: VarsMatcher; delay?: number } = {},
): MockedResponse => ({
  request: { query: CREATE_EXPENSE_OPTION, variables: over.match ?? (() => true) },
  delay: over.delay ?? 0,
  ...(over.fail
    ? { error: new Error('That key is already used in this list') }
    : {
        result: {
          data: {
            createExpenseOption: written({
              id: 'opt-league',
              key: 'LEAGUE',
              label: 'League',
              entity_source: 'CLUB',
              is_system: false,
            }),
          },
        },
      }),
  maxUsageCount: 20,
});

export const updateOptionMock = (match: VarsMatcher = () => true): MockedResponse => ({
  request: { query: UPDATE_EXPENSE_OPTION, variables: match },
  result: { data: { updateExpenseOption: written({ label: 'Venue hire' }) } },
  maxUsageCount: 20,
});

export const deleteOptionMock = (
  over: { fail?: boolean; match?: VarsMatcher } = {},
): MockedResponse => ({
  request: { query: DELETE_EXPENSE_OPTION, variables: over.match ?? (() => true) },
  ...(over.fail
    ? // Somebody filed an expense under it after the list was loaded.
      { error: new Error('1 expense(s) use this option — switch it off instead of deleting it') }
    : { result: { data: { deleteExpenseOption: true } } }),
  maxUsageCount: 20,
});
