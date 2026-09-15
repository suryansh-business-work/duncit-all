import { createContext, useContext } from 'react';
import type { TableFilterValue, TableSortDir } from '../types';

/**
 * What a column header reads and writes: the table's applied sort, and its
 * column filters.
 *
 * Headers are mounted by AG Grid, not by `DuncitTable`, so nothing can be
 * passed to them as props at render time. ag-grid-react renders them through
 * portals inside its own React tree, which is what lets a context reach them.
 */
export interface TableHeaderState {
  sortBy: string | null;
  sortDir: TableSortDir;
  filters: TableFilterValue[];
  setFilters: (filters: TableFilterValue[]) => void;
}

export const TableHeaderContext = createContext<TableHeaderState | null>(null);

export function useTableHeaderState(): TableHeaderState {
  const state = useContext(TableHeaderContext);
  // A developer's mistake, never a reader's: headers only mount inside DuncitTable.
  if (!state) throw new Error('useTableHeaderState: a column header rendered outside DuncitTable');
  return state;
}
