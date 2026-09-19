import { useEffect, useMemo, useRef } from 'react';
import { clientTableFetch, type DuncitColumn, type TableFetch } from '@duncit/table';

/**
 * A `DuncitTable` over rows the page already holds (a full list query).
 *
 * The table only re-runs its fetch on a query change, so a page whose rows
 * arrived after a mutation would keep showing the old page. The effect asks
 * the grid to reload whenever the rows change identity, which is exactly when
 * Apollo hands back a fresh list.
 */
export function useClientTable<T>(rows: readonly T[], searchOf: (row: T) => string, columns: ReadonlyArray<DuncitColumn<T>>) {
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useMemo<TableFetch<T>>(() => clientTableFetch(rows, searchOf, columns), [rows, searchOf, columns]);
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);
  return { fetchRows, refetchRef };
}
