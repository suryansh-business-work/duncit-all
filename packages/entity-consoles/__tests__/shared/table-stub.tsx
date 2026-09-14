// Test harness, not shipped code. A stand-in for `@duncit/table`'s grid that
// keeps what the console screens hand it under test — the REAL fetchRows (so the
// Apollo request a page builds is what the mocks match), the columns' getters and
// renderers, the pinned external filters and the row click — without AG Grid,
// which needs a layout engine jsdom does not have. Everything else the package
// exports (useApolloTableFetch, tableQueryToGql, …) stays real.
import { useEffect, useState, type ReactNode } from 'react';
import type { TableFilterValue, TablePage, TableQueryState } from '@duncit/table';

/** The first page the stub asks for — mirrored by every mocked table request. */
export const STUB_PAGE_SIZE = 25;

interface StubColumn {
  field: string;
  headerName?: string;
  valueGetter?: (row: never) => unknown;
  cellRenderer?: (row: never) => ReactNode;
}

interface StubTableProps {
  tableId: string;
  columns: StubColumn[];
  fetchRows: (q: TableQueryState) => Promise<TablePage<unknown>>;
  getRowId: (row: never) => string;
  emptyText?: string;
  defaultSort?: { field: string; dir: 'asc' | 'desc' };
  externalFilters?: ReadonlyArray<TableFilterValue>;
  searchPlaceholder?: string;
  onRowClick?: (row: never) => void;
}

/**
 * The GraphQL `query` variable the stub's first fetch maps to, through the real
 * `tableQueryToGql` — restated here so a mocked request reads as the page it is.
 */
export const firstPageVariables = (sortBy: string, filters: TableFilterValue[] = []) => ({
  query: {
    search: null,
    page: 1,
    page_size: STUB_PAGE_SIZE,
    sort_by: sortBy,
    sort_dir: 'desc',
    filters: filters.map((filter) => ({
      field: filter.field,
      op: filter.op,
      value: filter.value ?? null,
      values: filter.values ?? null,
    })),
  },
});

function StubCell({ column, row }: Readonly<{ column: StubColumn; row: unknown }>) {
  return (
    <span data-testid={`cell-${column.field}`}>
      {column.valueGetter ? (
        <span data-testid={`value-${column.field}`}>{String(column.valueGetter(row as never) ?? '')}</span>
      ) : null}
      {column.cellRenderer?.(row as never)}
    </span>
  );
}

export function DuncitTable(props: Readonly<StubTableProps>) {
  const { tableId, columns, fetchRows, getRowId, emptyText, defaultSort, externalFilters } = props;
  const [rows, setRows] = useState<unknown[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Compared by value, as the real table does — a page rebuilds the array per render.
  const filtersKey = JSON.stringify(externalFilters ?? []);

  useEffect(() => {
    const query: TableQueryState = {
      search: '',
      page: 1,
      pageSize: STUB_PAGE_SIZE,
      sortBy: defaultSort?.field ?? null,
      sortDir: defaultSort?.dir ?? 'desc',
      filters: JSON.parse(filtersKey) as TableFilterValue[],
    };
    fetchRows(query)
      .then((page) => setRows(page.rows))
      .catch((err: Error) => setError(err.message));
  }, [fetchRows, defaultSort?.field, defaultSort?.dir, filtersKey]);

  return (
    <div data-testid="duncit-table" data-table-id={tableId} data-search-placeholder={props.searchPlaceholder}>
      <div data-testid="table-headers">
        {columns.map((column) => (
          <span key={column.field} data-testid={`col-${column.field}`}>
            {column.headerName}
          </span>
        ))}
      </div>
      {error ? <div data-testid="table-error">{error}</div> : null}
      {rows?.length === 0 ? <div data-testid="table-empty">{emptyText}</div> : null}
      {rows?.map((row) => (
        <div key={getRowId(row as never)} data-testid="table-row" onClick={() => props.onRowClick?.(row as never)}>
          {columns.map((column) => (
            <StubCell key={column.field} column={column} row={row} />
          ))}
        </div>
      ))}
    </div>
  );
}
