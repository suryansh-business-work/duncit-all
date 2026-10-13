import { useEffect, useState, type MutableRefObject, type ReactNode } from 'react';

/** The slice of a `DuncitColumn` a stand-in grid needs to draw one cell. */
interface StubColumn<T> {
  field: string;
  headerName?: string;
  hide?: boolean;
  cellRenderer?: (row: T) => ReactNode;
  valueGetter?: (row: T) => unknown;
}

interface SearchQuery {
  search: string;
  page: number;
  pageSize: number;
  sortBy: string | null;
  sortDir: 'asc' | 'desc';
  filters: never[];
}

interface StubTableProps<T> {
  columns: StubColumn<T>[];
  fetchRows: (q: SearchQuery) => Promise<{ rows: T[]; total: number }>;
  getRowId: (row: T) => string;
  emptyText?: string;
  refetchRef?: MutableRefObject<(() => void) | null>;
  onRowClick?: (row: T) => void;
  toolbarActions?: ReactNode;
}

/**
 * The columns the most recent stub grid was handed. A cell renderer shadows its
 * column's `valueGetter`, so a test reads the getter (what the real grid sorts,
 * filters and exports by) straight from here.
 */
export const tableProbe: {
  columns: StubColumn<never>[];
  fetchRows: ((q: SearchQuery) => Promise<{ rows: unknown[]; total: number }>) | null;
} = { columns: [], fetchRows: null };

/** Runs the page's own `fetchRows` with a search term, as the grid's search box would. */
export const searchRows = (search: string) =>
  tableProbe.fetchRows?.({ search, page: 1, pageSize: 100, sortBy: null, sortDir: 'asc', filters: [] });

/** What the real grid would sort, filter and export `field` by for this row. */
export const columnValue = (field: string, row: unknown): unknown =>
  (
    tableProbe.columns.find((c) => c.field === field)?.valueGetter as
      | ((r: unknown) => unknown)
      | undefined
  )?.(row);

/**
 * A grid stand-in for page tests: it runs the page's own `fetchRows`, then draws
 * every column through its real `cellRenderer` / `valueGetter`, so the page's
 * data flow and cell code are exercised without AG Grid's virtualisation.
 */
export function StubTable<T>(p: Readonly<StubTableProps<T>>) {
  tableProbe.columns = p.columns as unknown as StubColumn<never>[];
  tableProbe.fetchRows = p.fetchRows as unknown as typeof tableProbe.fetchRows;
  const [rows, setRows] = useState<T[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    p.fetchRows({ search: '', page: 1, pageSize: 100, sortBy: null, sortDir: 'asc', filters: [] }).then(
      (page) => live && setRows(page.rows)
    );
    return () => {
      live = false;
    };
  }, [p.fetchRows, tick]);

  useEffect(() => {
    if (p.refetchRef) p.refetchRef.current = () => setTick((n) => n + 1);
  });

  if (rows === null) return <div role="progressbar" />;
  return (
    <div>
      {p.toolbarActions}
      {rows.length === 0 && <p>{p.emptyText}</p>}
      {rows.map((row) => (
        <div key={p.getRowId(row)} data-testid={`row-${p.getRowId(row)}`}>
          {p.onRowClick && (
            <button type="button" onClick={() => p.onRowClick?.(row)}>
              open-{p.getRowId(row)}
            </button>
          )}
          {p.columns
            .filter((c) => !c.hide)
            .map((c) => (
              <div key={c.field} data-field={c.field}>
                {c.cellRenderer
                  ? c.cellRenderer(row)
                  : String(c.valueGetter ? c.valueGetter(row) : (row as Record<string, unknown>)[c.field])}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
