import { useMemo } from 'react';
import { calculatePodProfit } from './calculate';
import type { PodProfitInputs, PodProfitResults } from './types';

/**
 * The single-pod tab's memoised view of `calculatePodProfit`.
 *
 * The maths itself lives in `calculate.ts` so the multi-pod tab can run it once
 * per saved pod — a hook cannot be called in a loop, and a second copy of the
 * waterfall is exactly the drift rule 34 exists to stop.
 */
export function useCalculator(inputs: PodProfitInputs): PodProfitResults {
  return useMemo(() => calculatePodProfit(inputs), [inputs]);
}
