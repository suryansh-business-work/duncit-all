import { useMemo } from 'react';
import { type DocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import type { AutoPodQueueVariables } from '@duncit/auto-pods';
import { formatMoney, mwebAutoPodLabels, type AutoPodLabels, type AutoPodRow } from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';
import { usePricing } from './usePricing';
import { useDateFormat } from '../utils/dateFormat';

export interface AutoPodQueueState {
  rows: AutoPodRow[];
  loading: boolean;
  error: boolean;
  /** Re-reads the queue — a row leaves it the moment the enrolment lands. */
  reload: () => void;
  labels: AutoPodLabels;
  formatWhen: (iso: string) => string;
  formatMoney: (amount: number) => string;
}

/**
 * Everything the three Auto Pod pages share: the role's queue, the copy, and
 * the two formatters the cards render through.
 *
 * `variables` narrows the queue — a city keeps offers pinned there plus every
 * unpinned one, and the host's sub-category narrows further. Dates go through
 * the admin-configured formatter and money through the admin-configured
 * currency symbol, so a venue, a host and a club admin all read the same slot
 * at the same wall-clock time (rule 11).
 */
export function useAutoPodQueue(
  document: DocumentNode,
  field: string,
  variables?: AutoPodQueueVariables,
): AutoPodQueueState {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { currency } = usePricing();

  const { data, loading, error, refetch } = useQuery<Record<string, AutoPodRow[]>>(document, {
    variables,
    fetchPolicy: 'cache-and-network',
  });
  const rows = data?.[field] ?? [];

  const labels = useMemo(() => mwebAutoPodLabels(t), [t]);

  return {
    rows,
    // A background refresh still has its rows — only a first load is blank, and
    // only a failure with nothing to show is an error.
    loading: loading && rows.length === 0,
    error: Boolean(error) && rows.length === 0,
    reload: () => {
      refetch().catch(() => undefined);
    },
    labels,
    formatWhen: formatDateTime,
    formatMoney: (amount: number) => formatMoney(amount, { symbol: currency }),
  };
}
