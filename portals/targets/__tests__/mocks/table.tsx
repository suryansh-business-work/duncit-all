import { useEffect, useState, type ReactNode } from 'react';

/**
 * Stand-in for @duncit/table's DuncitTable. The real AG Grid table is a shared,
 * separately tested package; this one renders plain rows so the console's own
 * column renderers, value getters, row menu and refetch wiring run for real.
 *
 * Everything else comes from the REAL package — an export missing here would
 * reach a component as `undefined` (dateColumn, rowMenuColumn, EM_DASH…).
 */
export * from '../../../../packages/table/src/index';

export const tableControls: { rows: unknown[]; fetches: number } = { rows: [], fetches: 0 };

export function resetTableControls(): void {
  tableControls.rows = [];
  tableControls.fetches = 0;
}

/** Answers every table read with `tableControls.rows`, counting the reads. */
export const useApolloTableFetch =
  <T,>(_client: unknown, _query: unknown, _key: string) =>
  (): Promise<{ rows: T[]; total: number }> => {
    tableControls.fetches += 1;
    const rows = tableControls.rows as T[];
    return Promise.resolve({ rows, total: rows.length });
  };

interface Column {
  field: string;
  valueGetter?: (row: unknown) => unknown;
  cellRenderer?: (row: unknown) => ReactNode;
}

function renderCell(column: Column, row: Record<string, unknown>): ReactNode {
  const value = column.valueGetter ? String(column.valueGetter(row)) : undefined;
  if (column.cellRenderer) return column.cellRenderer(row);
  return value ?? String(row[column.field] ?? '');
}

interface Props {
  columns: Column[];
  fetchRows: () => Promise<{ rows: Record<string, unknown>[] }>;
  getRowId: (row: Record<string, unknown>) => string;
  onRowClick?: (row: Record<string, unknown>) => void;
  emptyText?: string;
  searchPlaceholder?: string;
  refetchRef?: { current: (() => void) | null };
}

export function DuncitTable({ columns, fetchRows, getRowId, onRowClick, emptyText, searchPlaceholder, refetchRef }: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    const run = () => {
      void fetchRows().then((page) => setRows(page.rows));
    };
    if (refetchRef) refetchRef.current = run;
    run();
  }, [fetchRows, refetchRef]);

  return (
    <div data-testid="duncit-table" data-search={searchPlaceholder}>
      {rows.length === 0 && <div data-testid="table-empty">{emptyText}</div>}
      {rows.map((row) => (
        <div key={getRowId(row)} data-testid="table-row" role="row">
          {onRowClick && (
            <button type="button" data-testid="row-open" onClick={() => onRowClick(row)}>
              open
            </button>
          )}
          {columns.map((column) => (
            <span key={column.field} data-testid={`cell-${column.field}`}>
              {renderCell(column, row)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
