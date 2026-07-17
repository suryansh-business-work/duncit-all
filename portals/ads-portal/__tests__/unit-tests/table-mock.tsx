import { useEffect, useState, type ReactNode } from 'react';
import { format as formatWithDateFns } from 'date-fns';

/**
 * A lightweight stand-in for `@duncit/table` used by the ads-portal table pages
 * (My Ads, the dashboard's recent-requests table). It renders each column's
 * headerName, runs every `valueGetter` AND `cellRenderer` against the fetched
 * rows (so those functions are exercised for real), and wires
 * `onRowClick`/`getRowId`/`emptyText`/`toolbarActions`. Rows come from
 * `fetchRows`, which the page builds from the (mocked) `useApolloTableFetch`;
 * tests set them via `__setTableRows(...)`.
 *
 * `dateColumn`, `formatDateCell` and `EM_DASH` mirror the real cell helpers
 * (backed by date-fns) so `AdSummaryCard`/`AdDetailsPage` format dates for real.
 */
export const EM_DASH = '—';
export const DEFAULT_DATE_FORMAT = 'd MMM yyyy';

export function formatDateCell(
  iso: string | null | undefined,
  dateFormat: string = DEFAULT_DATE_FORMAT,
): string {
  return iso ? formatWithDateFns(new Date(iso), dateFormat) : EM_DASH;
}

interface DateColumnOptions {
  field?: string;
  headerName?: string;
  hide?: boolean;
  width?: number;
  filterable?: boolean;
  format?: string;
}

export function dateColumn<T>(options: DateColumnOptions = {}): DuncitColumn<T> {
  const {
    field = 'created_at',
    headerName = 'Created',
    hide = true,
    width = 130,
    filterable = true,
    format = DEFAULT_DATE_FORMAT,
  } = options;
  return {
    field,
    headerName,
    hide,
    width,
    filter: filterable ? { type: 'date' } : undefined,
    valueGetter: (row: T) =>
      formatDateCell((row as Record<string, unknown>)[field] as string | null | undefined, format),
  };
}

let ROWS: unknown[] = [];

export function __setTableRows(rows: unknown[]): void {
  ROWS = rows;
}

const resolveRows = async (): Promise<{ rows: unknown[]; total: number }> => ({
  rows: ROWS,
  total: ROWS.length,
});

export function useApolloTableFetch(): () => Promise<{ rows: unknown[]; total: number }> {
  return resolveRows;
}

export function makeApolloTableFetch(): () => Promise<{ rows: unknown[]; total: number }> {
  return resolveRows;
}

interface MockColumn {
  field: string;
  headerName: string;
  valueGetter?: (row: unknown) => unknown;
  cellRenderer?: (row: unknown) => ReactNode;
}

interface MockTableProps {
  columns: MockColumn[];
  fetchRows: (q: unknown) => Promise<{ rows: unknown[]; total: number }>;
  getRowId: (row: unknown) => string;
  onRowClick?: (row: unknown) => void;
  emptyText?: string;
  toolbarActions?: ReactNode;
  defaultSort?: { field: string; dir: string };
}

export function DuncitTable(props: Readonly<MockTableProps>) {
  const { columns, fetchRows, getRowId, onRowClick, emptyText, toolbarActions, defaultSort } = props;
  const [rows, setRows] = useState<unknown[]>([]);

  useEffect(() => {
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
    // Mount-only: fetchRows identity is unstable across renders in the pages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="duncit-table">
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
        <div
          key={getRowId(row)}
          data-testid="table-row"
          onClick={onRowClick ? () => onRowClick(row) : undefined}
        >
          {columns.map((c) => (
            <span key={c.field} data-testid={`cell-${c.field}`}>
              {c.valueGetter ? String(c.valueGetter(row) ?? '') : null}
              {c.cellRenderer ? c.cellRenderer(row) : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

// Re-export the type surface the pages import as `import type` (erased at
// runtime, but keep parity so named type imports resolve).
export type DuncitColumn<T> = {
  field: string;
  headerName: string;
  valueGetter?: (row: T) => unknown;
  cellRenderer?: (row: T) => ReactNode;
  [key: string]: unknown;
};
