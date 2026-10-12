import { useEffect, useState, type MutableRefObject, type ReactNode } from 'react';

/** The slice of a `DuncitColumn` a stand-in grid needs to draw one cell. */
interface StubColumn<T> {
  field: string;
  headerName?: string;
  hide?: boolean;
  cellRenderer?: (row: T) => ReactNode;
  valueGetter?: (row: T) => unknown;
}

interface StubTableProps<T> {
  columns: StubColumn<T>[];
  fetchRows: (q: {
    search: string;
    page: number;
    pageSize: number;
    sortBy: string | null;
    sortDir: 'asc' | 'desc';
    filters: never[];
  }) => Promise<{ rows: T[]; total: number }>;
  getRowId: (row: T) => string;
  emptyText?: string;
  refetchRef?: MutableRefObject<(() => void) | null>;
  onRowClick?: (row: T) => void;
  toolbarActions?: ReactNode;
}

/**
 * A grid stand-in for page tests: it runs the page's own `fetchRows`, then draws
 * every column through its real `cellRenderer` / `valueGetter`, so the page's
 * data flow and cell code are exercised without AG Grid's virtualisation.
 */
export function StubTable<T>(p: Readonly<StubTableProps<T>>) {
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
