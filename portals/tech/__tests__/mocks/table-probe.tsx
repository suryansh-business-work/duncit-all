import { useEffect, useState } from 'react';
import type { DuncitColumn } from '@duncit/table';

/**
 * A stand-in for `DuncitTable` that renders what each column's `valueGetter`
 * answers for every fetched row — the columns a table hides by default (a date
 * the toolbar can switch on) never reach the DOM through the real grid, but their
 * getters still decide what the export, the filter and the sort see.
 */
export function TableProbe<T>({
  columns,
  fetchRows,
}: Readonly<{
  columns: ReadonlyArray<DuncitColumn<T>>;
  fetchRows: (query: never) => Promise<{ rows: T[] }>;
}>) {
  const [rows, setRows] = useState<T[]>([]);
  useEffect(() => {
    let live = true;
    const query = { page: 1, pageSize: 50, search: '', filters: [], sortBy: null, sortDir: 'asc' } as never;
    fetchRows(query).then((page) => {
      if (live) setRows(page.rows);
    });
    return () => {
      live = false;
    };
  }, [fetchRows]);

  return (
    <div>
      {rows.map((row, index) => (
        // eslint-disable-next-line react/no-array-index-key -- a probe, rows have no stable id of their own
        <div key={index} role="row">
          {columns.map((column) => (
            <span key={column.field} data-col={column.field}>
              {String((column as { valueGetter?: (r: T) => unknown }).valueGetter?.(row) ?? '')}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
