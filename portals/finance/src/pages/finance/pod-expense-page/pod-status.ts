import { useMemo } from 'react';
import { useTranslation } from '@duncit/app-settings';
import type { StatusColorMap } from '@duncit/ui';
import type { PodExpensePodStatus } from './queries';

/**
 * The pod lifecycle as this screen colours it. Not the shared approval
 * vocabulary, so it is passed to `<StatusChip>` as a full replacement map.
 */
export const POD_STATUS_COLORS: StatusColorMap = {
  UPCOMING: 'info',
  ONGOING: 'success',
  COMPLETED: 'default',
  CANCELLED: 'error',
};

/**
 * Localized labels for the four pod states, keyed by the server's enum.
 *
 * Memoized because the column definitions depend on it: a fresh object per
 * render would rebuild every AG Grid column on every keystroke in the search
 * box.
 */
export function usePodStatusLabels(): Record<PodExpensePodStatus, string> {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      UPCOMING: t('finance.podExpense.statusUpcoming'),
      ONGOING: t('finance.podExpense.statusOngoing'),
      COMPLETED: t('finance.podExpense.statusCompleted'),
      CANCELLED: t('finance.podExpense.statusCancelled'),
    }),
    [t],
  );
}
