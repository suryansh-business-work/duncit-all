import { useEffect, useState, type ReactNode } from 'react';

/**
 * A stand-in for DuncitTable (AG Grid is covered by @duncit/table's own suite):
 * it calls `fetchRows` like the real table, then renders every row through each
 * column's cellRenderer / valueGetter, so a test can assert on what a page puts
 * in its table.
 */
interface Column {
  field: string;
  headerName?: string;
  valueGetter?: (row: unknown) => unknown;
  cellRenderer?: (row: unknown) => ReactNode;
}

interface Props {
  ariaLabel?: string;
  columns: readonly Column[];
  fetchRows: (q: object) => Promise<{ rows: unknown[]; total: number }>;
  getRowId: (row: unknown) => string;
  onRowClick?: (row: unknown) => void;
  emptyText?: string;
}

export function TableProbe({ ariaLabel, columns, fetchRows, getRowId, onRowClick, emptyText }: Readonly<Props>) {
  const [rows, setRows] = useState<unknown[] | null>(null);
  useEffect(() => {
    fetchRows({ search: '', page: 1, pageSize: 25, sortBy: null, sortDir: 'asc', filters: [] })
      .then((page) => setRows(page.rows))
      .catch(() => setRows([]));
  }, [fetchRows]);
  return (
    <table aria-label={ariaLabel}>
      <tbody>
        {rows?.length === 0 && (
          <tr>
            <td>{emptyText}</td>
          </tr>
        )}
        {rows?.map((row) => (
          <tr key={getRowId(row)} onClick={() => onRowClick?.(row)}>
            {columns.map((c) => (
              // The real grid reads valueGetter for search and sort even when a cell renderer draws the cell.
              <td key={c.field} data-value={String(c.valueGetter?.(row) ?? '')}>
                {c.cellRenderer ? c.cellRenderer(row) : String(c.valueGetter?.(row) ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
