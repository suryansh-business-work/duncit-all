import { useCallback, useState } from 'react';
import type { LeadRow } from './LeadsTable';

/** Cross-page multi-select state for the leads table (ids in a Set). */
export function useLeadSelection(rows: readonly LeadRow[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        rows.forEach((lead) => (checked ? next.add(lead.id) : next.delete(lead.id)));
        return next;
      });
    },
    [rows]
  );

  const clear = useCallback(() => setSelected(new Set()), []);

  return { selected, toggleOne, toggleAll, clear };
}
