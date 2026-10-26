import { useEffect, useMemo, useRef } from 'react';
import { clientTableFetch, type DuncitColumn } from '@duncit/table';

/**
 * A DuncitTable over rows a query already returned in full.
 *
 * The table reads its fetch through a ref, so a new set of rows (another
 * window, another connector) only shows once the table is asked to fetch
 * again — this does that, and the table keeps its sort and search. `searchOf`
 * and `columns` must be stable (memoized) or every render refetches.
 */
export function useClientRows<T>(
  rows: readonly T[],
  searchOf: (row: T) => string,
  columns: ReadonlyArray<DuncitColumn<T>>,
) {
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useMemo(() => clientTableFetch(rows, searchOf, columns), [rows, searchOf, columns]);
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);
  return { fetchRows, refetchRef };
}
