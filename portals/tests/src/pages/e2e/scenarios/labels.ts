import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import type { E2eScenarioState } from './queries';

/** Each scenario state as the reader's words — the chip and its filter read the same map. */
export function useScenarioStateLabels(): Record<E2eScenarioState, string> {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      PASSED: t('tech.e2eScenarios.statePassed'),
      FAILED: t('tech.e2eScenarios.stateFailed'),
      PENDING: t('tech.e2eScenarios.statePending'),
      SKIPPED: t('tech.e2eScenarios.stateSkipped'),
    }),
    [t]
  );
}

/** The describe blocks around a scenario — every title but its own. */
export const describeBlocks = (titlePath: readonly string[]): string[] => titlePath.slice(0, -1);
