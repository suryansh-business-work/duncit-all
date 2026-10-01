import { useCallback } from 'react';
import type {
  CellKeyDownEvent,
  FullWidthCellKeyDownEvent,
  GetRowIdParams,
  GridReadyEvent,
  ProcessRowParams,
  RowClassParams,
  RowClickedEvent,
  RowStyle,
  SortChangedEvent,
} from 'ag-grid-community';
import type { TableSortDir } from '../types';
import { ROW_CLICK_IGNORE } from './constants';

interface GridHandlerOptions<T> {
  tableId: string;
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  getRowStyle?: (row: T) => RowStyle | undefined;
  ariaLabel?: string;
  sortBy: string | null;
  sortDir: TableSortDir;
  setSort: (field: string | null, dir: TableSortDir) => void;
}

/** Every callback DuncitTable hands AG Grid, each with a stable identity. */
export function useGridHandlers<T>(options: GridHandlerOptions<T>) {
  const { tableId, getRowId, onRowClick, getRowStyle, ariaLabel, sortBy, sortDir, setSort } = options;

  // Defs carry the controlled sort, so the grid echoes our own updates back — only
  // forward header-click changes that actually differ from the current query state.
  const handleSortChanged = useCallback(
    (event: SortChangedEvent<T>) => {
      const sorted = event.api.getColumnState().find((state) => state.sort);
      const nextBy = sorted?.colId ?? null;
      const nextDir: TableSortDir = sorted?.sort === 'desc' ? 'desc' : 'asc';
      if (nextBy === sortBy && (nextBy === null || nextDir === sortDir)) return;
      setSort(nextBy, nextDir);
    },
    [setSort, sortBy, sortDir],
  );

  /**
   * Ignore clicks bubbling from buttons/links inside cells so row actions don't
   * double-fire — and from the whole selection cell, not just its checkbox.
   *
   * AG Grid's checkbox stops propagation itself, but it is a 16px input inside a
   * 50px cell. Every other pixel of that cell bubbles, so aiming at the tick box
   * and missing used to open the row's drawer with nothing selected.
   */
  const handleRowClicked = useCallback(
    (event: RowClickedEvent<T>) => {
      if (!onRowClick || !event.data) return;
      const target = event.event?.target;
      if (target instanceof Element && target.closest(ROW_CLICK_IGNORE)) return;
      onRowClick(event.data);
    },
    [onRowClick],
  );

  /**
   * The keyboard door to the same handler (WCAG 2.1.1). A row click is a mouse
   * gesture only, so with `onRowClick` wired the cells take focus and Enter on
   * one opens its row — unless focus sits on a control inside the cell, which
   * handles its own Enter, exactly as ROW_CLICK_IGNORE filters a click.
   */
  const handleCellKeyDown = useCallback(
    (event: CellKeyDownEvent<T> | FullWidthCellKeyDownEvent<T>) => {
      const key = event.event;
      if (!onRowClick || !event.data || !(key instanceof KeyboardEvent) || key.key !== 'Enter') return;
      if (key.target instanceof Element && key.target.closest(ROW_CLICK_IGNORE)) return;
      onRowClick(event.data);
    },
    [onRowClick],
  );

  const handleGridReady = useCallback(
    (event: GridReadyEvent<T>) => {
      if (ariaLabel) event.api.setGridAriaProperty('label', ariaLabel);
    },
    [ariaLabel],
  );

  /**
   * Every row names itself `<tableId>-row-<rowId>`, so an end-to-end suite can
   * find the one record it filed by the id the API gave it, instead of reading
   * AG Grid's own attributes or matching on text. `node.id` is `getRowId`'s
   * answer, which is what keeps the id stable across a refetch.
   */
  const handleRowPostCreate = useCallback(
    (params: ProcessRowParams<T>) => {
      params.eRow.dataset.testid = `${tableId}-row-${params.node.id}`;
    },
    [tableId],
  );

  const agGetRowId = useCallback((params: GetRowIdParams<T>) => getRowId(params.data), [getRowId]);
  const agGetRowStyle = useCallback(
    (params: RowClassParams<T>) => (getRowStyle && params.data ? getRowStyle(params.data) : undefined),
    [getRowStyle]
  );

  return {
    handleSortChanged,
    handleRowClicked,
    handleCellKeyDown,
    handleGridReady,
    handleRowPostCreate,
    agGetRowId,
    agGetRowStyle,
  };
}
