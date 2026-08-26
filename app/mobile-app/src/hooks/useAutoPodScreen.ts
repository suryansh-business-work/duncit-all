import { useCallback, useMemo } from 'react';
import { formatMoney, mwebAutoPodLabels, type AutoPodRole } from '@duncit/utils';

import { useAutoPods, type AutoPodQueueScope } from '@/hooks/useAutoPods';
import { useDateFormat } from '@/hooks/useDateFormat';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Everything all three Auto Pod screens need, assembled once.
 *
 * The queue itself plus the two formatters every card and sheet takes: dates in
 * the admin-configured format and zone (rule 11) and money in the admin's
 * currency, never a hardcoded one. `mwebAutoPodLabels` is the same copy builder
 * mWeb calls against the same `mweb.autoPods.*` namespace, which is what keeps
 * the two surfaces word-for-word identical (rule 27).
 *
 * `scope` is the screen's filters — the header's city and, for a host, a
 * sub-category — and a change to either re-reads the queue.
 */
export function useAutoPodScreen(role: AutoPodRole, scope: AutoPodQueueScope = {}) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { currency } = usePublicFinance();
  const queue = useAutoPods(role, scope);

  const labels = useMemo(() => mwebAutoPodLabels(t), [t]);
  const formatWhen = useCallback((iso: string) => formatDateTime(iso), [formatDateTime]);
  const money = useCallback(
    (amount: number) => formatMoney(amount, { symbol: currency }),
    [currency],
  );

  return { labels, formatWhen, formatMoney: money, ...queue };
}
