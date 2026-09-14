import { useEffect, useMemo, useRef } from 'react';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';

interface Props<T> {
  tableId: string;
  columns: DuncitColumn<T>[];
  rows: readonly T[];
  getRowId: (row: T) => string;
  searchOf: (row: T) => string;
  emptyText: string;
  searchPlaceholder: string;
}

/**
 * A DuncitTable over rows the page already polls. The table only fetches when
 * its own query changes, so a new set of rows is pushed in through its refetch
 * handle — otherwise a live list would freeze on the first answer.
 */
export default function LiveRowsTable<T>({
  tableId,
  columns,
  rows,
  getRowId,
  searchOf,
  emptyText,
  searchPlaceholder,
}: Readonly<Props<T>>) {
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useMemo(() => clientTableFetch(rows, searchOf), [rows, searchOf]);

  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  return (
    <DuncitTable<T>
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={emptyText}
      searchPlaceholder={searchPlaceholder}
      refetchRef={refetchRef}
    />
  );
}
