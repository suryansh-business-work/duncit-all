/**
 * The summary chips above the Duncit Expenses ledger follow the table's enum
 * filters. The grid sends an enum pick as `in`, and ExpenseFilterInput takes one
 * key per field — so a single pick narrows the summary and a multi-pick cannot.
 * (logic.test.ts covers search, `eq` and the date/amount ranges.)
 */
import { describe, expect, it } from 'vitest';
import type { TableFilterValue, TableQueryState } from '@duncit/table';
import { tableStateToExpenseFilter } from '../../src/pages/finance/expense-management-page/queries';

const stateWith = (filters: TableFilterValue[]): TableQueryState => ({
  search: '',
  page: 1,
  pageSize: 25,
  sortBy: null,
  sortDir: 'asc',
  filters,
});

describe('tableStateToExpenseFilter — enum picks', () => {
  it('pins a single picked Related From type and compensation status', () => {
    expect(
      tableStateToExpenseFilter(
        stateWith([
          { field: 'related_from_type', op: 'in', values: ['VENUE'] },
          { field: 'compensation_status', op: 'in', values: ['PARTIAL'] },
        ]),
      ),
    ).toEqual({ related_from_type: 'VENUE', compensation_status: 'PARTIAL' });
  });

  it('leaves the summary unfiltered when more than one option is picked', () => {
    expect(
      tableStateToExpenseFilter(
        stateWith([
          { field: 'category', op: 'in', values: ['RENT', 'MARKETING'] },
          { field: 'compensation_status', op: 'in', values: ['PENDING', 'FULL'] },
        ]),
      ),
    ).toBeUndefined();
  });
});
