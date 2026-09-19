import { useEffect, useState, type ReactNode } from 'react';

/**
 * A lightweight stand-in for `@duncit/table` (AG Grid has no layout to draw in
 * under jsdom). It keeps the real table's contract: a search box whose text
 * reaches `fetchRows`, the default sort, every column's `valueGetter` AND
 * `cellRenderer` run against the rows `fetchRows` resolves, and `emptyText`
 * when there are none.
 *
 * `clientTableFetch` is the REAL one — plain in-memory search, filter, sort and
 * paging with no grid behind it.
 */
export { clientTableFetch } from '../../../../packages/table/src/clientFetch';

interface MockColumn {
  field: string;
  headerName?: string;
  valueGetter?: (row: unknown) => unknown;
  cellRenderer?: (row: unknown) => ReactNode;
}

interface MockTableProps {
  tableId: string;
  columns: MockColumn[];
  fetchRows: (query: unknown) => Promise<{ rows: unknown[]; total: number }>;
  getRowId: (row: unknown) => string;
  emptyText?: string;
  searchPlaceholder?: string;
  defaultSort?: { field: string; dir: string };
}

/** A value getter's result as the grid would print it. */
const cellText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value);

export function DuncitTable(props: Readonly<MockTableProps>) {
  const { tableId, columns, fetchRows, getRowId, emptyText, searchPlaceholder, defaultSort } = props;
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<unknown[] | null>(null);
  const sortBy = defaultSort?.field ?? null;
  const sortDir = defaultSort?.dir ?? 'asc';

  useEffect(() => {
    let live = true;
    fetchRows({ search, page: 1, pageSize: 50, sortBy, sortDir, filters: [] })
      .then((page) => {
        if (live) setRows(page.rows);
      })
      .catch(() => setRows([]));
    return () => {
      live = false;
    };
  }, [fetchRows, search, sortBy, sortDir]);

  return (
    <div data-testid="duncit-table" data-table-id={tableId}>
      <input
        data-testid="table-search"
        aria-label={searchPlaceholder}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div data-testid="table-headers">
        {columns.map((column) => (
          <span key={column.field} data-testid={`header-${column.field}`}>
            {column.headerName}
          </span>
        ))}
      </div>
      {rows?.length === 0 && <div data-testid="table-empty">{emptyText}</div>}
      {rows?.map((row) => (
        <div key={getRowId(row)} data-testid="table-row">
          {columns.map((column) => (
            <span key={column.field} data-testid={`cell-${column.field}`}>
              {column.valueGetter ? <span data-testid="cell-value">{cellText(column.valueGetter(row))}</span> : null}
              {column.cellRenderer ? column.cellRenderer(row) : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
