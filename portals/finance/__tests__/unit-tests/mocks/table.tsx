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
  /**
   * Fire every query in `queries` before any has answered, the way the real
   * table does while someone is still typing a search — so a page's guard
   * against a slow earlier answer overwriting a newer one can be exercised.
   * The rows shown are the LAST query's.
   */
  concurrent: boolean;
} = {
  rows: [],
  rowsByKey: {},
  autoFetch: true,
  setRefetch: true,
  queries: [DEFAULT_Q],
  concurrent: false,
};

export function resetTableControls(): void {
  tableControls.rows = [];
  tableControls.rowsByKey = {};
  tableControls.autoFetch = true;
  tableControls.setRefetch = true;
  tableControls.queries = [DEFAULT_Q];
  tableControls.concurrent = false;
}

/** Runs the configured queries in order, or all at once, and answers with the last page. */
async function fetchAll(fetchRows: (q: typeof DEFAULT_Q) => Promise<{ rows?: any[] }>) {
  if (tableControls.concurrent) {
    const pages = await Promise.all(tableControls.queries.map((q) => fetchRows(q)));
    return pages.at(-1);
  }
  let last: { rows?: any[] } = { rows: [] };
  for (const q of tableControls.queries) {
    last = await fetchRows(q);
  }
  return last;
}

/**
 * Everything this stub does not have to fake comes from the REAL package.
 *
 * This file is aliased over '@duncit/table', so any export it omits reaches a
 * component as `undefined` — which is how `dateColumn` and then
 * `clientTableFetch` became "is not a function" and took whole suites down.
 * A hand-written copy drifts too: the old `tableQueryToGql` stub sent
 * `pageSize`/`sortBy` where the server's TableQueryInput takes `page_size`/
 * `sort_by`, so the schema-shaped mock rejected every table query it saw.
 * Only the two pieces that need AG-Grid or a live server — `DuncitTable` and
 * `useApolloTableFetch` — are defined below; a local export always wins over
 * an `export *` of the same name.
 */
export * from '../../../../../packages/table/src/index';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const last = await fetchAll(fetchRows);
      setRows(last?.rows ?? []);
    };
    // The real table catches a failed fetch and shows its message in place of
    // the rows (useTableQuery). Letting it escape instead turned every
    // unanswered query into an unhandled rejection that fails the whole run.
    const run = () => {
      setError(null);
      load().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      });
    };
    if (refetchRef && tableControls.setRefetch) {
      refetchRef.current = run;
    }
    if (tableControls.autoFetch) run();
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="duncit-table">
      <div data-testid="toolbar-actions">{toolbarActions}</div>
      {error ? <div data-testid="table-error">{error}</div> : null}
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
