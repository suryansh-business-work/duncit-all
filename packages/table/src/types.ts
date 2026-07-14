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
  headerName: string;
  sortable?: boolean; // default true
  filter?: DuncitColumnFilter; // absent => not filterable
  width?: number;
  flex?: number;
  minWidth?: number;
  hide?: boolean; // hidden by default (still in the column menu)
  valueGetter?: (row: T) => unknown; // plain fn, wrapped into AG Grid internally
  cellRenderer?: (row: T) => React.ReactNode; // custom cells (avatars, chips, actions)
}
