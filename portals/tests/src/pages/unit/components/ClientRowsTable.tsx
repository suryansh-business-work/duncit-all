import { useEffect, useMemo, useRef } from 'react';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';

interface Props<T> {
  tableId: string;
  ariaLabel: string;
  columns: DuncitColumn<T>[];
  rows: readonly T[];
  getRowId: (row: T) => string;
  searchOf: (row: T) => string;
  emptyText: string;
  searchPlaceholder: string;
  defaultSort?: { field: string; dir: 'asc' | 'desc' };
}

/**
 * A DuncitTable over rows the page already holds (a run's workspaces). The
 * table only fetches when its own query changes, so new rows — a live run's
 * next poll — are pushed in through its refetch handle.
 */
export default function ClientRowsTable<T>({
  tableId,
  ariaLabel,
  columns,
  rows,
  getRowId,
  searchOf,
  emptyText,
  searchPlaceholder,
  defaultSort,
}: Readonly<Props<T>>) {
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useMemo(() => clientTableFetch(rows, searchOf, columns), [rows, searchOf, columns]);

  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  return (
    <DuncitTable<T>
      ariaLabel={ariaLabel}
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={emptyText}
      searchPlaceholder={searchPlaceholder}
      refetchRef={refetchRef}
      defaultSort={defaultSort}
    />
  );
}
