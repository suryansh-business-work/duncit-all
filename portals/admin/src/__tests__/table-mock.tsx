import { useEffect, useState, type ReactNode } from 'react';

/**
 * A lightweight stand-in for `@duncit/table`. It renders each column's
 * `headerName`, runs every `valueGetter` AND `cellRenderer` against the fetched
 * rows (so those functions are exercised for real), and wires
 * `emptyText`/`getRowId`/`refetchRef`/`toolbarActions`. Rows come from
 * `fetchRows`, exactly as the real grid would call it.
 *
 * The real package renders through AG Grid, which needs a layout engine jsdom
 * does not have; this stub keeps the *column contract* under test instead.
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
  emptyText?: string;
  toolbarActions?: ReactNode;
  defaultSort?: { field: string; dir: string };
  refetchRef?: { current: (() => void) | null };
  tableId?: string;
  searchPlaceholder?: string;
}

export function DuncitTable(props: Readonly<MockTableProps>) {
  const { columns, fetchRows, getRowId, emptyText, toolbarActions, defaultSort, refetchRef } = props;
  const [rows, setRows] = useState<unknown[]>([]);

  const load = () => {
    Promise.resolve(
      fetchRows({
        search: '',
        page: 1,
        pageSize: 50,
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
    <div data-testid="duncit-table" data-search-placeholder={props.searchPlaceholder}>
      <div data-testid="table-toolbar">{toolbarActions}</div>
      <div data-testid="table-headers">
        {columns.map((c) => (
          <span key={c.field} data-testid={`col-${c.field}`}>
            {c.headerName}
          </span>
        ))}
      </div>
      {rows.length === 0 && <div data-testid="table-empty">{emptyText}</div>}
      {rows.map((row) => (
        <div key={getRowId(row as never)} data-testid="table-row">
          {columns.map((c) => (
            <span key={c.field} data-testid={`cell-${c.field}`}>
              {c.valueGetter ? <span data-testid={`value-${c.field}`}>{String(c.valueGetter(row as never) ?? '')}</span> : null}
              {c.cellRenderer ? c.cellRenderer(row as never) : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Passthrough for the pages that build `fetchRows` from Apollo. */
export const useApolloTableFetch = () => async () => ({ rows: [], total: 0 });

// Type surface the pages import as types (erased at runtime).
export type DuncitColumn<T> = {
  field: string;
  headerName: string;
  valueGetter?: (row: T) => unknown;
  cellRenderer?: (row: T) => ReactNode;
  [key: string]: unknown;
};
export type TableFetch<T> = (q: unknown) => Promise<{ rows: T[]; total: number }>;
