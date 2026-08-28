import { useEffect, useState, type ReactNode } from 'react';

/**
 * A lightweight stand-in for `@duncit/table`, scoped to this test directory only
 * (the shared `portals/admin/src/__tests__/table-mock.tsx` has no `onRowClick` or
 * `externalFilters` support, which TranslationEntriesTable relies on).
 *
 * Like the shared mock, it runs every column's `valueGetter`/`cellRenderer`
 * against real fetched rows and exposes the props the real AG-Grid-backed
 * DuncitTable cannot render under jsdom (search placeholder, default sort,
 * external filters) as data-* attributes so a test can assert on them.
 */
export interface MockColumn {
  field: string;
  headerName: string;
  valueGetter?: (row: never) => unknown;
  cellRenderer?: (row: never) => ReactNode;
  [key: string]: unknown;
}

interface MockTableProps {
  columns: MockColumn[];
  fetchRows: (q: unknown) => Promise<{ rows: unknown[]; total: number }>;
  getRowId: (row: never) => string;
  onRowClick?: (row: never) => void;
  emptyText?: string;
  defaultSort?: { field: string; dir: string };
  refetchRef?: { current: (() => void) | null };
  tableId?: string;
  searchPlaceholder?: string;
  externalFilters?: unknown;
}

export function DuncitTable(props: Readonly<MockTableProps>) {
  const { columns, fetchRows, getRowId, onRowClick, emptyText, defaultSort, refetchRef, externalFilters } = props;
  const [rows, setRows] = useState<unknown[]>([]);

  const load = () => {
    Promise.resolve(
      fetchRows({
        search: '',
        page: 1,
        pageSize: 25,
        sortBy: defaultSort?.field ?? null,
        sortDir: defaultSort?.dir ?? 'asc',
        filters: [],
      }),
    ).then((res) => setRows(res?.rows ?? []));
  };

  useEffect(() => {
    if (refetchRef) refetchRef.current = load;
    load();
    // Mount-only: fetchRows identity is unstable across renders in the pages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-testid="duncit-table"
      data-search-placeholder={props.searchPlaceholder}
      data-default-sort={JSON.stringify(defaultSort ?? null)}
      data-external-filters={JSON.stringify(externalFilters ?? null)}
    >
      <div data-testid="table-headers">
        {columns.map((c) => (
          <span key={c.field} data-testid={`col-${c.field}`}>
            {c.headerName}
          </span>
        ))}
      </div>
      {rows.length === 0 && <div data-testid="table-empty">{emptyText}</div>}
      {rows.map((row) => (
        <div
          key={getRowId(row as never)}
          data-testid="table-row"
          onClick={() => onRowClick?.(row as never)}
        >
          {columns.map((c) => (
            <span key={c.field} data-testid={`cell-${c.field}`}>
              {c.valueGetter ? (
                <span data-testid={`value-${c.field}`}>{String(c.valueGetter(row as never) ?? '')}</span>
              ) : null}
              {c.cellRenderer ? c.cellRenderer(row as never) : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

interface MockGqlClient {
  query(options: { query: unknown; variables?: Record<string, unknown>; fetchPolicy?: string }): Promise<{
    data: unknown;
  }>;
}

/** Passthrough that still round-trips through the real Apollo client's `query`. */
export function useApolloTableFetch<Row>(client: MockGqlClient, query: unknown, resultKey: string) {
  return async () => {
    const { data } = await client.query({ query, variables: {}, fetchPolicy: 'network-only' });
    const payload = (data as Record<string, { rows: Row[]; total: number }>)[resultKey];
    return { rows: payload.rows, total: payload.total };
  };
}

// Type surface the pages import as types (erased at runtime).
export type DuncitColumn<T> = {
  field: string;
  headerName: string;
  valueGetter?: (row: T) => unknown;
  cellRenderer?: (row: T) => ReactNode;
  [key: string]: unknown;
};
export type TableFetch<T> = (q: unknown) => Promise<{ rows: T[]; total: number }>;
export type TableFilterValue = { field: string; op: string; value?: unknown };
