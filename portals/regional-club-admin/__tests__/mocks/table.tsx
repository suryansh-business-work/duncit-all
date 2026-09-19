import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { vi } from 'vitest';

/**
 * A lightweight stand-in for `@duncit/table` (AG Grid has no layout to draw in
 * under jsdom). It runs every column's `valueGetter` AND `cellRenderer` against
 * the rows its `fetchRows` resolves — so the console's own column code is
 * exercised for real — and wires `onRowClick`, `emptyText` and
 * `toolbarActions` the way the real grid does.
 *
 * The column builders and the in-memory fetch come from the REAL package: they
 * are plain functions with no grid behind them, so there is nothing to stub
 * and a re-export cannot drift behind the package.
 */
export { actionsColumn, dateColumn } from '../../../../packages/table/src/cells';
export { clientTableFetch } from '../../../../packages/table/src/clientFetch';

interface Page {
  rows: unknown[];
  total: number;
}

type Fetch = (query: unknown) => Promise<Page>;

/** Server rows per root field, as `useApolloTableFetch` would read them. */
const SERVER_ROWS = new Map<string, unknown[]>();
/** One stable fetch per root field, as the real hook memoises its own. */
const FETCHERS = new Map<string, Fetch>();

export function setServerRows(rootField: string, rows: unknown[]): void {
  SERVER_ROWS.set(rootField, rows);
}

function fetcherFor(rootField: string): Fetch {
  const existing = FETCHERS.get(rootField);
  if (existing) return existing;
  const fetch: Fetch = async () => {
    const rows = SERVER_ROWS.get(rootField) ?? [];
    return { rows, total: rows.length };
  };
  FETCHERS.set(rootField, fetch);
  return fetch;
}

/** Records what each table asked the server for; answers from `setServerRows`. */
export const useApolloTableFetch = vi.fn(
  (_client: unknown, _document: unknown, rootField: string, _options?: unknown, _deps?: unknown[]) =>
    fetcherFor(rootField),
);

export function resetTableMock(): void {
  SERVER_ROWS.clear();
  FETCHERS.clear();
  useApolloTableFetch.mockClear();
}

interface MockColumn {
  field: string;
  headerName?: string;
  valueGetter?: (row: unknown) => unknown;
  cellRenderer?: (row: unknown) => ReactNode;
}

interface MockTableProps {
  tableId: string;
  ariaLabel?: string;
  columns: MockColumn[];
  fetchRows: Fetch;
  getRowId: (row: unknown) => string;
  onRowClick?: (row: unknown) => void;
  emptyText?: string;
  toolbarActions?: ReactNode;
  defaultSort?: { field: string; dir: string };
}

/** The real grid ignores clicks that land on a control inside a cell. */
const ROW_CLICK_IGNORE = 'button, a, input';

/** A value getter's result as the grid would print it. */
const cellText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value);

export function DuncitTable(props: Readonly<MockTableProps>) {
  const { tableId, ariaLabel, columns, fetchRows, getRowId, onRowClick, emptyText, toolbarActions, defaultSort } =
    props;
  const [rows, setRows] = useState<unknown[] | null>(null);
  const sortBy = defaultSort?.field ?? null;
  const sortDir = defaultSort?.dir ?? 'asc';

  useEffect(() => {
    let live = true;
    fetchRows({ search: '', page: 1, pageSize: 50, sortBy, sortDir, filters: [] })
      .then((page) => {
        if (live) setRows(page.rows);
      })
      .catch(() => setRows([]));
    return () => {
      live = false;
    };
  }, [fetchRows, sortBy, sortDir]);

  const clickRow = (event: MouseEvent<HTMLDivElement>, row: unknown) => {
    if (event.target instanceof Element && event.target.closest(ROW_CLICK_IGNORE)) return;
    onRowClick?.(row);
  };

  return (
    <div data-testid="duncit-table" data-table-id={tableId} data-aria-label={ariaLabel}>
      <div data-testid="table-toolbar">{toolbarActions}</div>
      <div data-testid="table-headers">
        {columns.map((column) => (
          <span key={column.field} data-testid={`header-${column.field}`}>
            {column.headerName}
          </span>
        ))}
      </div>
      {rows?.length === 0 && <div data-testid="table-empty">{emptyText}</div>}
      {rows?.map((row) => (
        <div key={getRowId(row)} data-testid="table-row" onClick={(event) => clickRow(event, row)}>
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
