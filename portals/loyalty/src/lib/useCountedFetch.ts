import { useCallback, useRef, useState } from 'react';
import type { TableFetch, TableQueryState } from '@duncit/table';

/**
 * A table fetch that also reports the matching row count for the page header.
 *
 * The table drops out-of-order responses; the sequence counter keeps the
 * header count on the same footing, so a slow earlier search cannot overwrite
 * the number the newest one returned.
 */
export function useCountedFetch<T>(fetchTable: TableFetch<T>) {
  const [total, setTotal] = useState<number | null>(null);
  const seqRef = useRef(0);
  const fetchRows = useCallback(
    async (query: TableQueryState) => {
      seqRef.current += 1;
      const seq = seqRef.current;
      const page = await fetchTable(query);
      if (seq === seqRef.current) setTotal(page.total);
      return page;
    },
    [fetchTable],
  );
  return { total, fetchRows };
}
