// Test harness for the hosts console suites, not shipped code.
//
// The package's table mock runs every column's valueGetter and cellRenderer
// against the rows `fetchRows` returns, but it has no row click and ignores the
// external filter a records tab pins. Both are part of what the hosts screens
// promise (a row opens its record; a host's pods are scoped to their account),
// so this wraps that mock rather than copying it, and adds exactly those two.
import { useCallback, useState } from 'react';
import { useLocation } from 'react-router';
import { DuncitTable as TableMock, type MockColumn } from '../../../__tests__/table-mock';

type Page = { rows: unknown[]; total: number };

export interface TableStandInProps {
  columns: MockColumn[];
  fetchRows: (q: unknown) => Promise<Page>;
  getRowId: (row: never) => string;
  tableId?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  defaultSort?: { field: string; dir: string };
  externalFilters?: unknown[];
  onRowClick?: (row: never) => void;
}

export function TableStandIn(props: Readonly<TableStandInProps>) {
  const { fetchRows, getRowId, onRowClick, tableId, externalFilters } = props;
  const [rows, setRows] = useState<unknown[]>([]);

  const trackedFetch = useCallback(
    async (q: unknown) => {
      const page = await fetchRows(q);
      setRows(page.rows);
      return page;
    },
    [fetchRows],
  );

  return (
    <div data-testid={tableId} data-external-filters={JSON.stringify(externalFilters ?? [])}>
      <TableMock {...props} fetchRows={trackedFetch} />
      {rows.map((row) => {
        const id = getRowId(row as never);
        return (
          <button key={id} type="button" onClick={() => onRowClick?.(row as never)}>
            {`open ${id}`}
          </button>
        );
      })}
    </div>
  );
}

/** Where the page under test landed, for asserting a navigation. */
export function LocationProbe() {
  const location = useLocation();
  return <span data-testid="pathname">{location.pathname}</span>;
}
