import type { ColDef, ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
import type { DuncitColumn, TableSortDir } from './types';

/** Effective hidden flag: persisted override wins, else the column's declared default. */
export function isColumnHidden<T>(
  column: DuncitColumn<T>,
  overrides: Record<string, boolean>,
): boolean {
  return overrides[column.field] ?? column.hide ?? false;
}

function buildValueGetter<T>(column: DuncitColumn<T>) {
  return (params: ValueGetterParams<T>): unknown => {
    if (!params.data) return undefined;
    if (column.valueGetter) return column.valueGetter(params.data);
    return (params.data as Record<string, unknown>)[column.field];
  };
}

function buildCellRenderer<T>(column: DuncitColumn<T>) {
  const render = column.cellRenderer;
  if (!render) return undefined;
  return (params: ICellRendererParams<T>) => (params.data ? render(params.data) : null);
}

/**
 * Derives AG Grid column defs from DuncitColumn[]. Sort display is controlled: the def
 * carries the hook's current sort so header arrows always mirror the query state.
 */
export function buildColDefs<T>(
  columns: ReadonlyArray<DuncitColumn<T>>,
  hiddenOverrides: Record<string, boolean>,
  sortBy: string | null,
  sortDir: TableSortDir,
): ColDef<T>[] {
  return columns.map((column) => ({
    colId: column.field,
    headerName: column.headerName,
    sortable: column.sortable ?? true,
    hide: isColumnHidden(column, hiddenOverrides),
    width: column.width,
    flex: column.flex,
    minWidth: column.minWidth,
    sort: sortBy === column.field ? sortDir : null,
    valueGetter: buildValueGetter(column),
    cellRenderer: buildCellRenderer(column),
  }));
}
