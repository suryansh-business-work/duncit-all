import { useEffect, useState, type MutableRefObject, type ReactNode } from 'react';

/**
 * A stand-in for `@duncit/table`'s DuncitTable (AG Grid has no layout to draw in
 * under jsdom). It keeps the real table's contract where the console relies on
 * it: it runs the page's own `fetchRows` with the page's external filters, draws
 * every visible column through its real `cellRenderer` / `valueGetter`, shows
 * `emptyText` for no rows, opens a row through `onRowClick`, and answers
 * `refetchRef` by fetching again.
 *
 * Mount it with: vi.mock('@duncit/table', async (io) => ({ ...(await io()), DuncitTable: StubTable }))
 */

interface StubColumn<T> {
  field: string;
  headerName?: string;
  hide?: boolean;
  cellRenderer?: (row: T) => ReactNode;
  valueGetter?: (row: T) => unknown;
}

interface StubFilter {
  field: string;
  op: string;
  value?: string;
  values?: string[];
}

export interface StubQuery {
  search: string;
  page: number;
  pageSize: number;
  sortBy: string | null;
  sortDir: 'asc' | 'desc';
  filters: StubFilter[];
}

interface StubTableProps<T> {
  tableId: string;
  columns: StubColumn<T>[];
  fetchRows: (query: StubQuery) => Promise<{ rows: T[]; total: number }>;
  getRowId: (row: T) => string;
  emptyText?: string;
  ariaLabel?: string;
  refetchRef?: MutableRefObject<(() => void) | null>;
  onRowClick?: (row: T) => void;
  externalFilters?: ReadonlyArray<StubFilter>;
  defaultSort?: { field: string; dir: 'asc' | 'desc' };
}

/** What the most recent stub grid was handed. */
export const tableProbe: {
  columns: StubColumn<never>[];
  fetchRows: ((query: StubQuery) => Promise<{ rows: unknown[]; total: number }>) | null;
  fetches: number;
} = { columns: [], fetchRows: null, fetches: 0 };

export function resetTableProbe(): void {
  tableProbe.columns = [];
  tableProbe.fetchRows = null;
  tableProbe.fetches = 0;
}

/** Runs the page's own `fetchRows` with a search term, as the grid's search box would. */
export const searchRows = (search: string) =>
  tableProbe.fetchRows?.({ search, page: 1, pageSize: 100, sortBy: null, sortDir: 'asc', filters: [] });

const cellText = (value: unknown): string => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');

export function StubTable<T>(props: Readonly<StubTableProps<T>>) {
  const { tableId, columns, fetchRows, getRowId, emptyText, ariaLabel, refetchRef, onRowClick, externalFilters, defaultSort } = props;
  tableProbe.columns = columns as unknown as StubColumn<never>[];
  tableProbe.fetchRows = fetchRows as unknown as typeof tableProbe.fetchRows;
  const [rows, setRows] = useState<T[] | null>(null);
  const [tick, setTick] = useState(0);
  const filterKey = JSON.stringify(externalFilters ?? []);

  useEffect(() => {
    let live = true;
    tableProbe.fetches += 1;
    fetchRows({
      search: '',
      page: 1,
      pageSize: 100,
      sortBy: defaultSort?.field ?? null,
      sortDir: defaultSort?.dir ?? 'asc',
      filters: JSON.parse(filterKey) as StubFilter[],
    })
      .then((page) => {
        if (live) setRows(page.rows);
      })
      .catch(() => {
        if (live) setRows([]);
      });
    return () => {
      live = false;
    };
  }, [fetchRows, tick, filterKey, defaultSort?.field, defaultSort?.dir]);

  useEffect(() => {
    if (refetchRef) refetchRef.current = () => setTick((n) => n + 1);
  });

  if (rows === null) return <div data-testid={`table-loading-${tableId}`} />;
  return (
    <div data-testid={`table-${tableId}`} aria-label={ariaLabel}>
      {rows.length === 0 ? <p>{emptyText}</p> : null}
      {rows.map((row) => (
        <div key={getRowId(row)} data-testid={`row-${getRowId(row)}`}>
          {onRowClick ? (
            <button type="button" onClick={() => onRowClick(row)}>
              open-{getRowId(row)}
            </button>
          ) : null}
          {columns
            .filter((column) => !column.hide)
            .map((column) => (
              <div key={column.field} data-field={column.field}>
                {column.cellRenderer ? column.cellRenderer(row) : cellText(column.valueGetter?.(row) ?? (row as Record<string, unknown>)[column.field])}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

/** What the real grid would sort, filter and export `field` by for this row. */
export const columnValue = (field: string, row: unknown): unknown =>
  (tableProbe.columns.find((column) => column.field === field)?.valueGetter as ((r: unknown) => unknown) | undefined)?.(row);
