import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import type { DuncitColumn, TableFetch, TableSortDir } from '@duncit/table';

/**
 * A stand-in for `DuncitTable` (AG Grid does not lay out in jsdom).
 *
 * It keeps the contract the pages rely on: a fetch on mount with the default
 * sort, another whenever the search box changes or the page calls
 * `refetchRef` (the real grid does not refetch when `fetchRows` changes
 * identity), each cell drawn by the column's `cellRenderer`, else its
 * `valueGetter`, else the raw field — with the `valueGetter` text (what the
 * grid sorts, filters and exports) on the cell's `data-value` — and a row click.
 * Import it ONLY from a `vi.mock('@duncit/table', ...)` factory.
 */
interface Props<T> {
  tableId: string;
  ariaLabel?: string;
  columns: ReadonlyArray<DuncitColumn<T>>;
  fetchRows: TableFetch<T>;
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  toolbarActions?: ReactNode;
  emptyText?: string;
  searchPlaceholder?: string;
  defaultSort?: { field: string; dir: TableSortDir };
  refetchRef?: MutableRefObject<(() => void) | null>;
}

const asText = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

function cellOf<T>(column: DuncitColumn<T>, row: T): ReactNode {
  if (column.cellRenderer) return column.cellRenderer(row);
  return asText(column.valueGetter ? column.valueGetter(row) : (row as Record<string, unknown>)[column.field]);
}

export function FakeDuncitTable<T>({ tableId, ariaLabel, columns, fetchRows, getRowId, onRowClick, toolbarActions, emptyText, searchPlaceholder, defaultSort, refetchRef }: Readonly<Props<T>>) {
  const [rows, setRows] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const fetchRef = useRef(fetchRows);
  fetchRef.current = fetchRows;

  useEffect(() => {
    if (!refetchRef) return undefined;
    refetchRef.current = () => setVersion((value) => value + 1);
    return () => {
      refetchRef.current = null;
    };
  }, [refetchRef]);

  useEffect(() => {
    let live = true;
    fetchRef
      .current({ search, page: 1, pageSize: 25, sortBy: defaultSort?.field ?? null, sortDir: defaultSort?.dir ?? 'asc', filters: [] })
      .then((page) => {
        if (live) setRows(page.rows);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      live = false;
    };
  }, [version, search, defaultSort?.field, defaultSort?.dir]);

  return (
    <section aria-label={ariaLabel} data-testid={`table-${tableId}`}>
      <input aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={search} onChange={(event) => setSearch(event.target.value)} />
      <div>{toolbarActions}</div>
      {error && <p role="alert">{error}</p>}
      {rows.length === 0 && <p data-testid="table-empty">{emptyText}</p>}
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.field}>{column.headerName}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowId(row)} data-testid={`row-${getRowId(row)}`} onClick={onRowClick ? () => onRowClick(row) : undefined}>
              {columns.map((column) => (
                <td key={column.field} data-testid={`cell-${column.field}`} data-value={column.valueGetter ? asText(column.valueGetter(row)) : undefined}>
                  {cellOf(column, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
