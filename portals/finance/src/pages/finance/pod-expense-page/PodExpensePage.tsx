import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Box, Divider, Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { useTranslation } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import PodExpenseKpis from './PodExpenseKpis';
import PodExpensePodsTable from './PodExpensePodsTable';
import PodExpenseDrawer from './PodExpenseDrawer';
import {
  POD_EXPENSE_SUMMARY,
  SCOPE_FILTERS,
  type PodExpensePodRow,
  type PodExpenseScope,
  type PodExpenseSummaryData,
} from './queries';

interface SummaryQueryData {
  podExpenseSummary: PodExpenseSummaryData;
  publicFinanceSettings: { currency_symbol: string };
}

/**
 * Finance > Pod Expenses.
 *
 * Every pod Duncit runs is a row; opening one is how a bill gets recorded
 * against it. The list is the money view — what has been spent per pod and
 * which entries are still missing their invoice.
 */
export default function PodExpensePage() {
  const { t } = useTranslation();
  const podsRefetch = useRef<(() => void) | null>(null);
  const [activePod, setActivePod] = useState<PodExpensePodRow | null>(null);

  const summaryQuery = useQuery<SummaryQueryData>(POD_EXPENSE_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });
  const currency = summaryQuery.data?.publicFinanceSettings?.currency_symbol ?? '';

  const tabs = useTabParam<PodExpenseScope>({
    items: [
      { value: 'all', label: t('finance.podExpense.tabAllPods') },
      { value: 'recorded', label: t('finance.podExpense.tabRecorded') },
      { value: 'missing-bills', label: t('finance.podExpense.tabMissingBills') },
    ],
    fallback: 'all',
  });
  const externalFilters = useMemo(() => SCOPE_FILTERS[tabs.value], [tabs.value]);

  const handleSaved = useCallback(() => {
    podsRefetch.current?.();
    summaryQuery.refetch().catch((e) =>
      logs.portal.finance.warn('PodExpensePage', 'handleSaved', {
        error: e,
        msg: 'Pod expense summary refresh failed',
      }),
    );
  }, [summaryQuery]);

  return (
    <Box>
      <PageHeader
        title={t('finance.podExpense.title')}
        subtitle={t('finance.podExpense.subtitle')}
        sx={{ mb: 3 }}
      />

      <Stack spacing={2}>
        <PodExpenseKpis
          summary={summaryQuery.data?.podExpenseSummary}
          currency={currency}
          loading={summaryQuery.loading}
        />

        <Box>
          <DuncitTabs {...tabs} variant="scrollable" allowScrollButtonsMobile />
          <Divider sx={{ mb: 2 }} />
          <PodExpensePodsTable
            currency={currency}
            externalFilters={externalFilters}
            refetchRef={podsRefetch}
            onRowClick={setActivePod}
          />
        </Box>
      </Stack>

      <PodExpenseDrawer
        seedPod={activePod}
        currency={currency}
        onClose={() => setActivePod(null)}
        onSaved={handleSaved}
      />
    </Box>
  );
}
