import type React from 'react';

export type TableSortDir = 'asc' | 'desc';

export type TableFilterOp =
  | 'eq'
  | 'ne'
  | 'in'
  | 'contains'
  | 'gte'
  | 'lte'
  | 'between'
  | 'is_true'
  | 'is_false';

export interface TableFilterValue {
  field: string;
  op: TableFilterOp;
  value?: string; // single-value ops; ISO strings for dates, stringified numbers
  values?: string[]; // 'in' and 'between' ([min,max])
}

export interface TableQueryState {
  search: string; // already debounced by the time fetchRows sees it
  page: number; // 1-based
  pageSize: number; // 10 | 25 | 50 | 100
  sortBy: string | null;
  sortDir: TableSortDir;
  filters: TableFilterValue[];
}

/**
 * What the table is showing right now: the query it last FETCHED with — the
 * user's search and filters plus the page's pinned external ones — and how many
 * rows the server said match it.
 *
 * It exists for actions that have to act on a set nobody can tick. "Delete every
 * row matching this view" covers rows on pages the grid has never loaded, so the
 * only honest way to name that set is the query that produced it. Paging and
 * sorting ride along because the shape is one type; an action on the whole set
 * ignores them.
 */
export interface TableQuerySnapshot {
  query: TableQueryState;
  total: number;
}

export interface TablePage<T> {
  rows: T[];
  total: number;
}

export type TableFetch<T> = (q: TableQueryState) => Promise<TablePage<T>>;

export type DuncitColumnFilter =
  | { type: 'text' }
  | {
      type: 'select';
      options: ReadonlyArray<{ value: string; label: string }>;
      multiple?: boolean;
    }
  | { type: 'number' } // renders min/max -> gte/lte/between
  | { type: 'date' } // renders from/to (MUI X pickers) -> between with ISO values
  | { type: 'boolean' };

export interface DuncitColumn<T> {
  field: string; // server-side sort/filter key AND row accessor
  /** The header, already translated by whoever built the column. */
  headerName?: string;
  /**
   * A translation key for the header, resolved by the grid at render time.
   *
   * It exists for the column FACTORIES in `cells.tsx`: they hand back a column
   * before there is a React tree, so they cannot call `t` themselves, and a
   * caller that does not name a header would otherwise get an English literal
   * baked into a definition (rule 38). Pass one or the other, never both.
   */
  headerKey?: string;
  sortable?: boolean; // default true
  filter?: DuncitColumnFilter; // absent => not filterable
  width?: number;
  flex?: number;
  minWidth?: number;
  hide?: boolean; // hidden by default (still in the column menu)
  valueGetter?: (row: T) => unknown; // plain fn, wrapped into AG Grid internally
  cellRenderer?: (row: T) => React.ReactNode; // custom cells (avatars, chips, actions)
}
