import { useEffect, useState, type ReactNode } from 'react';

/**
 * Test double for @duncit/shell's DuncitTable. The real AG-Grid table is a
 * shared, separately-tested package; here we render a lightweight table that
 * drives the finance-portal column `cellRenderer`/`valueGetter` functions and
 * the page's `fetchRows` callback so their branches are exercised for real.
 */
const DEFAULT_Q = {
  search: '',
  filters: [] as { field: string; op: string; value?: string; values?: string[] }[],
  page: 1,
  pageSize: 25,
  sortBy: undefined as string | undefined,
  sortDir: 'asc' as 'asc' | 'desc',
};

export const tableControls: {
  rows: unknown[];
  /**
   * Rows per response key, for a screen that renders TWO tables at once.
   *
   * Pod Expenses is the case: the pods list and the drawer's entries list are
   * both mounted, and one shared `rows` would feed pod rows through the entry
   * columns — which reads as a crash in a cell renderer rather than as the
   * setup mistake it is. A key with no entry falls back to `rows`, so every
   * existing single-table suite is untouched.
   */
  rowsByKey: Record<string, unknown[]>;
  autoFetch: boolean;
  setRefetch: boolean;
  queries: Array<typeof DEFAULT_Q>;
} = {
  rows: [],
  rowsByKey: {},
  autoFetch: true,
  setRefetch: true,
  queries: [DEFAULT_Q],
};

export function resetTableControls(): void {
  tableControls.rows = [];
  tableControls.rowsByKey = {};
  tableControls.autoFetch = true;
  tableControls.setRefetch = true;
  tableControls.queries = [DEFAULT_Q];
}

export const tableQueryToGql = (q: unknown) => ({ query: q });

/**
 * The column builders come from the REAL package rather than a copy.
 *
 * This file is aliased over '@duncit/table', so any export it omits reaches a
 * component as `undefined` — which is exactly how `dateColumn` became "is not
 * a function" and took fifteen suites down with it. They are pure builders
 * over MUI and date-fns with no AG-Grid behind them, so there is nothing to
 * stub; a re-export also cannot drift behind the package again, which a
 * hand-written copy already had.
 */
export {
  EM_DASH,
  actionsColumn,
  activeChipColumn,
  dateColumn,
  entityIdColumn,
  formatDateCell,
} from '../../../../../packages/table/src/cells';

export const useApolloTableFetch =
  <T,>(_client: unknown, _query: unknown, key: string) =>
  (_state: unknown): Promise<{ rows: T[]; total: number }> => {
    const rows = (tableControls.rowsByKey[key] ?? tableControls.rows) as T[];
    return Promise.resolve({ rows, total: rows.length });
  };

function renderCell(col: any, row: any): ReactNode {
  // Always invoke valueGetter (for coverage), but only render its text when there
  // is no cellRenderer — otherwise both would print and duplicate the visible text.
  const value = col.valueGetter ? String(col.valueGetter(row)) : undefined;
  if (col.cellRenderer) return col.cellRenderer(row);
  if (value !== undefined) return value;
  return String(row[col.field] ?? '');
}

export function DuncitTable(props: any) {
  const { columns, fetchRows, getRowId, onRowClick, toolbarActions, emptyText, refetchRef } = props;
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      let last: { rows?: any[] } = { rows: [] };
      for (const q of tableControls.queries) {
        last = await fetchRows(q);
      }
      setRows(last?.rows ?? []);
    };
    if (refetchRef && tableControls.setRefetch) {
      refetchRef.current = () => {
        void run();
      };
    }
    if (tableControls.autoFetch) void run();
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="duncit-table">
      <div data-testid="toolbar-actions">{toolbarActions}</div>
      {rows.length === 0 ? (
        <div data-testid="table-empty">{emptyText}</div>
      ) : (
        rows.map((row) => (
          <div key={getRowId(row)} data-testid="table-row" role="row">
            {onRowClick && (
              <button type="button" data-testid="row-open" onClick={() => onRowClick(row)}>
                open
              </button>
            )}
            {columns.map((col: any, i: number) => (
              <span data-testid={`cell-${col.field ?? i}`} key={col.field ?? i}>
                {renderCell(col, row)}
              </span>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
