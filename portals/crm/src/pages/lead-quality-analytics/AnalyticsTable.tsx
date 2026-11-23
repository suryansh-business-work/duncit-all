import { useMemo } from 'react';
import { clientTableFetch, DuncitTable, type DuncitColumn } from '@duncit/table';

interface Props<T> {
  tableId: string;
  ariaLabel: string;
  rows: readonly T[];
  columns: ReadonlyArray<DuncitColumn<T>>;
  getRowId: (row: T) => string;
  searchOf: (row: T) => string;
  emptyText: string;
  defaultSort?: { field: string; dir: 'asc' | 'desc' };
}

/**
 * A table over rows the analytics answer already holds: search, filters, sort
 * and paging run in memory with the same grid every CRM listing uses.
 */
export default function AnalyticsTable<T>({ tableId, ariaLabel, rows, columns, getRowId, searchOf, emptyText, defaultSort }: Readonly<Props<T>>) {
  const fetchRows = useMemo(() => clientTableFetch(rows, searchOf, columns), [rows, searchOf, columns]);
  return (
    <DuncitTable<T>
      tableId={tableId}
      ariaLabel={ariaLabel}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={emptyText}
      defaultSort={defaultSort}
      defaultPageSize={10}
    />
  );
}
