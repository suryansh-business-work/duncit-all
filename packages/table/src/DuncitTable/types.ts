import type { MutableRefObject, ReactNode } from 'react';
import type { RowStyle } from 'ag-grid-community';
import type {
  DuncitColumn,
  TableFetch,
  TableFilterValue,
  TableQuerySnapshot,
  TableSortDir,
} from '../types';
import type { DuncitTableSelection } from '../useGridSelection';

export interface DuncitTableProps<T> {
  tableId: string; // REQUIRED unique key; persistence namespace
  columns: ReadonlyArray<DuncitColumn<T>>;
  fetchRows: TableFetch<T>; // THE server bridge — the only data path
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  // Optional per-row inline style (e.g. tint a low-stock row). Backward-compatible.
  getRowStyle?: (row: T) => RowStyle | undefined;
  toolbarActions?: ReactNode; // right-aligned extras (e.g. "+ Create" button)
  emptyText?: string;
  defaultSort?: { field: string; dir: TableSortDir };
  defaultPageSize?: 10 | 25 | 50 | 100; // default 25
  searchPlaceholder?: string;
  refetchRef?: MutableRefObject<(() => void) | null>; // parent-triggered reload after mutations
  /**
   * Filled with a "replace this one row" fn, like refetchRef.
   *
   * The row-level answer to the same problem refetchRef solves: an action whose
   * mutation already returned the updated entity can put it straight into the
   * grid instead of re-asking the server for the whole page. Only that row
   * repaints, so an open menu, the scroll position and the current page all
   * survive. Reach for refetchRef instead when the change could move the row
   * OUT of the current view — that is a membership change, and only the query
   * can answer it.
   */
  updateRowRef?: MutableRefObject<((row: T) => void) | null>;
  // Page-level filters from controls outside the table (tabs/selects/URL params).
  // Compared by value; a change resets to page 1 and refetches. Not shown as chips.
  externalFilters?: ReadonlyArray<TableFilterValue>;
  // Opt in to a checkbox column. Absent means no selection config reaches the grid at
  // all — unless the grid offers bulk delete, which brings its own checkbox column.
  selection?: DuncitTableSelection<T>;
  /**
   * The query the grid is showing, and how many rows match it server-side.
   * Fires whenever either changes.
   *
   * Selection can only ever hand back rows the grid HAS (see the note on
   * handleSelectionChanged). An action that has to cover the rest — "delete
   * every row matching this view", which reaches pages nobody has loaded — can
   * only name that set by the query behind it, and can only say how big it is
   * from the server's own count. This is that pair.
   *
   * Pass a stable callback (useCallback): a fresh identity each render would
   * fire the effect below on every render.
   */
  onQueryChange?: (snapshot: TableQuerySnapshot) => void;
  /**
   * The grid's accessible name (WCAG 1.3.1 / 4.1.2), e.g. the page's heading —
   * "Pods", "Payout requests". A screen reader announces it on entering the
   * grid; without it every table on a page is just "grid". Applied when the
   * grid is ready.
   */
  ariaLabel?: string;
}
