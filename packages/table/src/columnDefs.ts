import type {
  ColDef,
  ICellRendererParams,
  ITooltipParams,
  ValueGetterParams,
} from 'ag-grid-community';
import type { DuncitColumn, TableSortDir } from './types';

/** Class applied to plain-text cells so a global CSS rule can ellipsize them. */
export const TRUNCATE_CELL_CLASS = 'duncit-truncate-cell';

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
 * Full-text hover tooltip for plain-text (non-renderer) cells so truncated content
 * is still readable. Custom renderers own their own layout, so they get no tooltip.
 */
function buildTooltipValueGetter<T>(column: DuncitColumn<T>) {
  if (column.cellRenderer) return undefined;
  return (params: ITooltipParams<T>): string | undefined => {
    const data = params.data;
    if (!data) return undefined;
    const raw = column.valueGetter
      ? column.valueGetter(data)
      : (data as Record<string, unknown>)[column.field];
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'number' || typeof raw === 'boolean' || typeof raw === 'bigint') {
      return String(raw);
    }
    return undefined;
  };
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
    cellClass: column.cellRenderer ? undefined : TRUNCATE_CELL_CLASS,
    tooltipValueGetter: buildTooltipValueGetter(column),
  }));
}
