import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, Divider, Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { useTranslation } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import type { EmployeeExpenseClaim, EmployeeExpenseTotals } from '@duncit/utils';
import EmployeeExpenseKpis from './EmployeeExpenseKpis';
import EmployeeExpensesTable from './EmployeeExpensesTable';
import ReviewClaimDialog from './ReviewClaimDialog';
import {
  EMPLOYEE_EXPENSE_SUMMARY,
  SCOPE_FILTERS,
  type ClaimScope,
} from './queries';

interface SummaryQueryData {
  employeeExpenseSummary: EmployeeExpenseTotals;
  publicFinanceSettings: { currency_symbol: string };
}

/**
 * Finance > Employee Expenses.
 *
 * The approval queue for what employees paid out of pocket. It opens on the
 * claims still awaiting a decision rather than on everything — the whole point
 * of the screen is the work outstanding, and an all-claims landing buries it.
 */
export default function EmployeeExpensePage() {
  const { t } = useTranslation();
  const queueRefetch = useRef<(() => void) | null>(null);
  const [activeClaim, setActiveClaim] = useState<EmployeeExpenseClaim | null>(null);

  const summaryQuery = useQuery<SummaryQueryData>(EMPLOYEE_EXPENSE_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });
  const currency = summaryQuery.data?.publicFinanceSettings?.currency_symbol ?? '';

  const tabs = useTabParam<ClaimScope>({
    items: [
      { value: 'pending', label: t('employeeExpense.review.tabPending') },
      { value: 'approved', label: t('employeeExpense.review.tabApproved') },
      { value: 'rejected', label: t('employeeExpense.review.tabRejected') },
      { value: 'all', label: t('employeeExpense.review.tabAll') },
    ],
    fallback: 'pending',
  });
  const externalFilters = useMemo(() => SCOPE_FILTERS[tabs.value], [tabs.value]);

  const handleDecided = useCallback(() => {
    queueRefetch.current?.();
    summaryQuery.refetch().catch((e) =>
      logs.portal.finance.warn('EmployeeExpensePage', 'handleDecided', {
        error: e,
        msg: 'Employee expense summary refresh failed',
      }),
    );
  }, [summaryQuery]);

  return (
    <Box>
      <PageHeader
        title={t('employeeExpense.review.title')}
        subtitle={t('employeeExpense.review.subtitle')}
        sx={{ mb: 3 }}
      />

      <Stack spacing={2}>
        <EmployeeExpenseKpis
          summary={summaryQuery.data?.employeeExpenseSummary}
          currency={currency}
          loading={summaryQuery.loading}
        />

        <Box>
          <DuncitTabs {...tabs} variant="scrollable" allowScrollButtonsMobile />
          <Divider sx={{ mb: 2 }} />
          <EmployeeExpensesTable
            currency={currency}
            externalFilters={externalFilters}
            refetchRef={queueRefetch}
            onRowClick={setActiveClaim}
          />
        </Box>
      </Stack>

      <ReviewClaimDialog
        claim={activeClaim}
        currency={currency}
        onClose={() => setActiveClaim(null)}
        onDecided={handleDecided}
      />
    </Box>
  );
}
