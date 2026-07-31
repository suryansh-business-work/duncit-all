import { useEffect, useState, type ReactNode } from 'react';

/**
 * Lightweight stand-in for `@duncit/table` used by the marketing-portal table
 * pages. It renders each column's `valueGetter` AND `cellRenderer` against the
 * fetched rows (so those functions are exercised for real), wires
 * `toolbarActions`/`onRowClick`/`getRowId`/`emptyText`, and exposes a real
 * `refetchRef.current` (matching production `DuncitTable`).
 *
 * Page specs feed rows through `__setTableRows(...)` (consumed by the mocked
 * `useApolloTableFetch`); component specs pass a `fetchRows` built with
 * `fetchRowsFrom(...)`.
 */
/** Mirrors the real `@duncit/table` export — column code compares against it. */
export const EM_DASH = '—';

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

/** Build a `fetchRows` that always resolves the given rows (component specs). */
export const fetchRowsFrom =
  (rows: unknown[]) => async (): Promise<{ rows: unknown[]; total: number }> => ({
    rows,
    total: rows.length,
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyColumn = {
  field?: string;
  headerName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  valueGetter?: (row: any) => unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cellRenderer?: (row: any) => ReactNode;
};

export function dateColumn(opts: Partial<AnyColumn> & Record<string, unknown> = {}): AnyColumn {
  return { field: (opts.field as string) ?? 'created_at', headerName: opts.headerName ?? 'Date', ...opts };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionsOpts = Record<string, any>;

/** The real column swaps the label for `disabledTitle` while disabled, so a
 * spec can assert on the reason a row action is unavailable. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actionLabel = (config: ActionsOpts | undefined, row: any, fallback: string) => {
  const base = config?.title ?? fallback;
  if (config?.disabled?.(row) && config?.disabledTitle) return config.disabledTitle;
  return base;
};

/** Mirrors the real actionsColumn closely enough to click: `renderExtra`
 * first, then one button per configured handler, labelled from its `title`
 * (or `disabledTitle`) so specs can find it. */
export function actionsColumn(opts: ActionsOpts = {}): AnyColumn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderAction = (row: any, config: ActionsOpts | undefined, fallback: string, onClick: (r: any) => void) => {
    const label = actionLabel(config, row, fallback);
    return (
      <button
        type="button"
        aria-label={label}
        disabled={config?.disabled?.(row) ?? false}
        onClick={() => onClick(row)}
      >
        {label}
      </button>
    );
  };
  return {
    field: opts.field ?? 'actions',
    headerName: opts.headerName ?? 'Actions',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cellRenderer: (row: any) => (
      <>
        {opts.renderExtra?.(row)}
        {opts.onEdit && renderAction(row, opts.edit, 'Edit', opts.onEdit)}
        {opts.onDelete && renderAction(row, opts.delete, 'Delete', opts.onDelete)}
      </>
    ),
  };
}

interface MockTableProps {
  columns: AnyColumn[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchRows: (q: unknown) => Promise<{ rows: any[]; total: number }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRowId?: (row: any) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowClick?: (row: any) => void;
  emptyText?: string;
  toolbarActions?: ReactNode;
  refetchRef?: { current: (() => void) | null };
}

export function DuncitTable(props: Readonly<MockTableProps>) {
  const { columns, fetchRows, getRowId, onRowClick, emptyText, toolbarActions, refetchRef } = props;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows, setRows] = useState<any[]>([]);

  const load = () => {
    Promise.resolve(fetchRows({})).then((res) => setRows(res?.rows ?? [])).catch(() => setRows([]));
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
      {rows.length === 0 && <div data-testid="table-empty">{emptyText}</div>}
      {rows.map((row, index) => (
        <div key={getRowId ? getRowId(row) : String(index)} data-testid="table-row">
          {columns.map((column) => (
            <span key={column.field ?? column.headerName} data-testid={`cell-${column.field ?? column.headerName}`}>
              {column.valueGetter ? String(column.valueGetter(row) ?? '') : ''}
              {column.cellRenderer ? column.cellRenderer(row) : null}
            </span>
          ))}
          {onRowClick ? (
            <button type="button" onClick={() => onRowClick(row)}>{`rowclick-${index}`}</button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// Re-export the type surface the pages import as values-in-types (erased at
// runtime, but keep parity so `import type` and named imports both resolve).
export type DuncitColumn<T> = {
  field?: string;
  headerName?: string;
  valueGetter?: (row: T) => unknown;
  cellRenderer?: (row: T) => ReactNode;
  [key: string]: unknown;
};
export type TableFetch<T> = (q: unknown) => Promise<{ rows: T[]; total: number }>;
