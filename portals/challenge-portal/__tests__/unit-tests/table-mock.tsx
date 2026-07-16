import { useEffect, useState, type ReactNode } from 'react';

/**
 * A lightweight stand-in for `@duncit/table` used by the challenge-portal table
 * pages. It renders each column's headerName, runs every `valueGetter` AND
 * `cellRenderer` against the fetched rows (so those functions are exercised for
 * real), and wires `emptyText`/`getRowId`/`refetchRef`/`toolbarActions`. Rows
 * come from `fetchRows`, which the page builds from `useApolloTableFetch`.
 *
 * The column-helper factories (`actionsColumn`, `activeChipColumn`,
 * `dateColumn`) mirror the real package's public shape closely enough for the
 * table columns to render and their handlers to fire.
 */
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

export interface MockColumn {
  field: string;
  headerName: string;
  valueGetter?: (row: unknown) => unknown;
  cellRenderer?: (row: unknown) => ReactNode;
  [key: string]: unknown;
}

const EM_DASH = '—';

export function dateColumn(options: Record<string, unknown> = {}): MockColumn {
  const field = (options.field as string) ?? 'created_at';
  return {
    field,
    headerName: (options.headerName as string) ?? 'Created',
    kind: 'date',
    valueGetter: (row) => {
      const iso = (row as Record<string, unknown>)[field] as string | null | undefined;
      return iso ? new Date(iso).toISOString().slice(0, 10) : EM_DASH;
    },
  };
}

export function activeChipColumn(options: Record<string, unknown> = {}): MockColumn {
  const field = (options.field as string) ?? 'is_active';
  const label = (active: boolean) => (active ? 'Active' : 'Inactive');
  return {
    field,
    headerName: (options.headerName as string) ?? 'Status',
    kind: 'active',
    opts: options,
    valueGetter: (row) => label(Boolean((row as Record<string, unknown>)[field])),
    cellRenderer: (row) => <span>{label(Boolean((row as Record<string, unknown>)[field]))}</span>,
  };
}

interface ActionConfig {
  ariaLabel?: string;
}
interface ActionsOptions {
  onEdit?: (row: unknown) => void;
  onDelete?: (row: unknown) => void;
  edit?: ActionConfig;
  delete?: ActionConfig;
}

export function actionsColumn(options: ActionsOptions): MockColumn {
  const { onEdit, onDelete, edit, delete: del } = options;
  return {
    field: 'actions',
    headerName: 'Actions',
    kind: 'actions',
    opts: options,
    cellRenderer: (row) => (
      <span>
        {onEdit && (
          <button type="button" aria-label={edit?.ariaLabel ?? 'Edit'} onClick={() => onEdit(row)}>
            edit
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            aria-label={del?.ariaLabel ?? 'Delete'}
            onClick={() => onDelete(row)}
          >
            delete
          </button>
        )}
      </span>
    ),
  };
}

interface MockTableProps {
  columns: MockColumn[];
  fetchRows: (q: unknown) => Promise<{ rows: unknown[]; total: number }>;
  getRowId: (row: unknown) => string;
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
        <div key={getRowId(row)} data-testid="table-row">
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

// Re-export the type surface the pages import as types (erased at runtime).
export type DuncitColumn<T> = {
  field: string;
  headerName: string;
  valueGetter?: (row: T) => unknown;
  cellRenderer?: (row: T) => ReactNode;
  [key: string]: unknown;
};
export type TableFetch<T> = (q: unknown) => Promise<{ rows: T[]; total: number }>;
