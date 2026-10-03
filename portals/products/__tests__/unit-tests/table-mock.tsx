import { useEffect, useState, type ReactNode } from 'react';

/**
 * A lightweight stand-in for `@duncit/table` used by the products portal table
 * pages. It renders each column's headerName, runs every `valueGetter` AND
 * `cellRenderer` against the fetched rows (so those functions are exercised for
 * real), and wires `onRowClick`/`getRowId`/`emptyText`. Rows come from
 * `fetchRows`, which the page builds from the (mocked) `useApolloTableFetch`.
 *
 * Tests set the rows a page will see via `__setTableRows(...)`.
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
  refetchRef?: { current: (() => void) | null };
}

export function DuncitTable(props: Readonly<MockTableProps>) {
  const { columns, fetchRows, getRowId, onRowClick, emptyText, toolbarActions, defaultSort, refetchRef } =
    props;
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
    // Expose a real refetch so pages that call refetchRef.current?.() exercise
    // the non-null branch (production DuncitTable wires this the same way).
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
        <div
          key={getRowId(row)}
          data-testid="table-row"
          onClick={onRowClick ? () => onRowClick(row) : undefined}
        >
          {columns.map((c) => {
            const plain = !c.valueGetter && !c.cellRenderer;
            return (
              <span key={c.field} data-testid={`cell-${c.field}`}>
                {c.valueGetter ? String(c.valueGetter(row) ?? '') : null}
                {c.cellRenderer ? c.cellRenderer(row) : null}
                {plain ? String((row as Record<string, unknown>)[c.field] ?? '') : null}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Re-export the type surface the pages import as values-in-types (erased at
// runtime, but keep parity so `import type` and named imports both resolve).
export type DuncitColumn<T> = {
  field: string;
  headerName: string;
  valueGetter?: (row: T) => unknown;
  cellRenderer?: (row: T) => ReactNode;
  [key: string]: unknown;
};
export type TableFetch<T> = (q: unknown) => Promise<{ rows: T[]; total: number }>;

interface MockRowMenuItem {
  key: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface MockRowMenuOptions<T> {
  field?: string;
  headerName?: string;
  ariaLabel?: string | ((row: T) => string);
  items: (row: T) => MockRowMenuItem[];
}

/**
 * The ⋮ row menu, as a button that reveals its items. The real menu renders
 * in a portal outside the grid, so choosing an item never opens the row —
 * here every click stops at the menu to keep that contract.
 */
function MockRowMenu({ label, items }: Readonly<{ label: string; items: MockRowMenuItem[] }>) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <span>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      />
      {open && (
        <span role="menu">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

export function rowMenuColumn<T>(options: MockRowMenuOptions<T>): DuncitColumn<T> {
  const labelOf = (row: T) =>
    typeof options.ariaLabel === 'function' ? options.ariaLabel(row) : (options.ariaLabel ?? 'Actions');
  return {
    field: options.field ?? 'menu',
    headerName: options.headerName ?? '',
    cellRenderer: (row: T) => <MockRowMenu label={labelOf(row)} items={options.items(row)} />,
  };
}
