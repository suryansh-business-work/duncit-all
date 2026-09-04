import { useCallback, useState } from 'react';
import { autoPodEarningsPatch, type AutoPodEarningsState, type AutoPodRow } from '@duncit/utils';

/**
 * The RN twin of `@duncit/auto-pods`' `useAutoPodEarnings` (rule 27) — that
 * package reaches MUI through its index, so the hook itself cannot be imported
 * here; the map it maintains comes from `@duncit/utils`, which both call.
 */
export function useAutoPodEarnings(): AutoPodEarningsState {
  const [row, setRow] = useState<AutoPodRow | null>(null);
  const [values, setValues] = useState<Readonly<Record<string, number>>>({});
  const record = useCallback(
    (amount: number | null) => {
      if (row) setValues((prev) => autoPodEarningsPatch(prev, row.id, amount));
    },
    [row],
  );
  const open = useCallback((next: AutoPodRow) => setRow(next), []);
  const close = useCallback(() => setRow(null), []);
  return { row, open, close, record, values };
}
