import { useEffect, useRef, type MutableRefObject } from 'react';

/**
 * Make a DuncitTable re-read rows it already holds in memory.
 *
 * `useTableQuery` keeps `fetchRows` in a ref and only refetches when the QUERY
 * changes, which is right for a server-backed table and wrong for these: their
 * rows arrive with the page, and a retry rewrites them under a query that has
 * not moved. Without this the audit would keep showing the failure a re-run had
 * just fixed.
 */
export function useTableRefresh(rows: unknown): MutableRefObject<(() => void) | null> {
  const refetchRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    refetchRef.current?.();
  }, [rows]);
  return refetchRef;
}
