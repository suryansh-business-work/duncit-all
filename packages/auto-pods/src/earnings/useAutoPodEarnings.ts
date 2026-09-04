import { useCallback, useState } from 'react';
import { autoPodEarningsPatch, type AutoPodEarningsState, type AutoPodRow } from '@duncit/utils';

/**
 * Which card's calculator is open on this page, and what the viewer has worked
 * out so far. The map itself is maintained by `autoPodEarningsPatch` in
 * `@duncit/utils`, which the native twin calls too (rule 40).
 */
export function useAutoPodEarnings(): AutoPodEarningsState {
  const [row, setRow] = useState<AutoPodRow | null>(null);
  const [values, setValues] = useState<Readonly<Record<string, number>>>({});

  return {
    row,
    open: useCallback((next: AutoPodRow) => setRow(next), []),
    close: useCallback(() => setRow(null), []),
    record: useCallback(
      (amount: number | null) => {
        if (row) setValues((prev) => autoPodEarningsPatch(prev, row.id, amount));
      },
      [row]
    ),
    values,
  };
}
