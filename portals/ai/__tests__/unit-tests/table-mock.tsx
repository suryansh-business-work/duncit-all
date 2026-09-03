import { useEffect, useState, type ReactNode } from 'react';

/**
 * A lightweight stand-in for `@duncit/table`.
 *
 * The real grid is AG Grid, whose own package proves it. What these tables need
 * proving is their COLUMNS — every `valueGetter` and `cellRenderer` is a small
 * piece of product logic (a fallback, a currency, a status word), and AG Grid
 * does not run any of them in jsdom. This runs each one for real against the
 * rows `fetchRows` returns.
 */
interface MockColumn {
  field: string;
  headerName?: string;
  valueGetter?: (row: never) => unknown;
  cellRenderer?: (row: never) => ReactNode;
}

interface MockTableProps {
  columns: MockColumn[];
  fetchRows: (q: unknown) => Promise<{ rows: unknown[]; total: number }>;
  getRowId: (row: never) => string;
  onRowClick?: (row: never) => void;
  emptyText?: string;
  defaultSort?: { field: string; dir: string };
  refetchRef?: { current: (() => void) | null };
}

export function DuncitTable(props: Readonly<MockTableProps>) {
  const { columns, fetchRows, getRowId, onRowClick, emptyText, defaultSort, refetchRef } = props;
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
    // A real refetch, so a page that calls refetchRef.current?.() takes the
    // non-null branch exactly as it does in production.
    if (refetchRef) refetchRef.current = load;
    load();
    // Mount-only: fetchRows identity is unstable across renders in the pages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="duncit-table">
      {rows.length === 0 && <div data-testid="table-empty">{emptyText}</div>}
      {rows.map((row) => (
        <div
          key={getRowId(row as never)}
          data-testid="table-row"
          onClick={onRowClick ? () => onRowClick(row as never) : undefined}
        >
          {columns.map((column) => {
            // AG Grid RUNS the valueGetter — it feeds sorting and the renderer —
            // but DISPLAYS the cellRenderer when there is one. Showing both would
            // put every value on screen twice.
            const value = column.valueGetter
              ? String(column.valueGetter(row as never) ?? '')
              : String((row as Record<string, unknown>)[column.field] ?? '');
            return (
              <span key={column.field} data-testid={'cell-' + column.field}>
                {column.cellRenderer ? column.cellRenderer(row as never) : value}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** The real one formats a date column; here the raw value is enough to assert on. */
export const dateColumn = (field: string, headerName: string, extra: object = {}) => ({
  field,
  headerName,
  ...extra,
});

/** Filters an in-memory list — the pages hand it rows and a search function. */
export const clientTableFetch =
  <Row,>(rows: readonly Row[], searchOf: (row: Row) => string) =>
  async (query: { search?: string }) => {
    const term = String(query?.search ?? '').toLowerCase();
    const matched = term ? rows.filter((row) => searchOf(row).toLowerCase().includes(term)) : rows;
    return { rows: [...matched], total: matched.length };
  };
