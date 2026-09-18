import { useMemo } from 'react';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';

interface ClientTableProps<T> {
  tableId: string;
  rows: readonly T[];
  columns: ReadonlyArray<DuncitColumn<T>>;
  /** The text the search box matches a row against. */
  searchOf: (row: T) => string;
  ariaLabel: string;
  emptyText: string;
  searchPlaceholder: string;
  onRowClick?: (row: T) => void;
  getRowId: (row: T) => string;
}

/**
 * The shared grid over rows this page already holds — a short list a query
 * answered in full, searched, filtered, sorted and paged in memory.
 */
export default function ClientTable<T>({ rows, columns, searchOf, ...table }: Readonly<ClientTableProps<T>>) {
  const fetchRows = useMemo(() => clientTableFetch(rows, searchOf, columns), [rows, searchOf, columns]);
  return <DuncitTable<T> {...table} columns={columns} fetchRows={fetchRows} defaultPageSize={10} />;
}
