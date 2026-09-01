import { useMemo } from 'react';
import { type DocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import type { AutoPodQueueVariables } from '@duncit/auto-pods';
import { formatINR, shellAutoPodLabels, type AutoPodLabels, type AutoPodRow } from '@duncit/utils';

/** Everything an Auto Pod page hands to <AutoPodQueue /> and its claim dialog. */
export interface AutoPodsQueue {
  labels: AutoPodLabels;
  rows: AutoPodRow[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
  formatWhen: (iso: string) => string;
  formatMoney: (amount: number) => string;
}

/**
 * The venue, host and club queues differ only in which document they read and
 * which filters they pass, so the query, the shared shell copy and the
 * admin-configured date/money formatting are assembled here once instead of
 * on all three pages.
 */
export default function useAutoPodsQueue(
  document: DocumentNode,
  field: string,
  variables?: AutoPodQueueVariables,
): AutoPodsQueue {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const labels = useMemo(() => shellAutoPodLabels(t), [t]);
  const { data, loading, error, refetch } = useQuery<Record<string, AutoPodRow[]>>(document, {
    variables,
    fetchPolicy: 'cache-and-network',
  });

  return {
    labels,
    rows: data?.[field] ?? [],
    // A background refresh must not swap the cards back out for a spinner.
    loading: loading && !data,
    error: !!error,
    refetch: () => {
      refetch().catch(() => undefined);
    },
    formatWhen: (iso) => fmt.formatDateTime(iso),
    formatMoney: (amount) => formatINR(amount),
  };
}
