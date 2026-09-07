import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import ExpenseDashboardKpis from './ExpenseDashboardKpis';
import ExpenseDashboardFilters from './ExpenseDashboardFilters';
import ExpenseBreakdownCard from './ExpenseBreakdownCard';
import { useExpenseOptions } from '../expense-config';
import {
  EMPTY_FILTER,
  EXPENSE_DASHBOARD,
  toFilterVariables,
  type ExpenseDashboardData,
  type ExpenseDashboardFilter,
} from './queries';

interface DashboardQueryData {
  expenseDashboard: ExpenseDashboardData;
  publicFinanceSettings: { currency_symbol: string };
}

/**
 * Finance > Expenses > Dashboard.
 *
 * The filter bar drives the tiles AND the three breakdowns from one query, so
 * the bars always add up to the total above them. Every breakdown is labelled
 * through the same configured lists the filters offer — a category renamed in
 * Settings is renamed here on the next read, with nothing to keep in step.
 */
export default function ExpenseDashboardPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<ExpenseDashboardFilter>(EMPTY_FILTER);
  const variables = useMemo(() => ({ filter: toFilterVariables(filter) }), [filter]);

  const { data, loading } = useQuery<DashboardQueryData>(EXPENSE_DASHBOARD, {
    variables,
    fetchPolicy: 'cache-and-network',
  });
  const currency = data?.publicFinanceSettings?.currency_symbol ?? '';
  const dashboard = data?.expenseDashboard;

  const categories = useExpenseOptions('CATEGORY');
  const relatedTypes = useExpenseOptions('RELATED_FROM_TYPE');
  const methods = useExpenseOptions('COMPENSATION_METHOD');

  return (
    <Box>
      <PageHeader
        title={t('finance.expenseDashboard.title')}
        subtitle={t('finance.expenseDashboard.subtitle')}
        sx={{ mb: 3 }}
      />

      <Stack spacing={2}>
        <ExpenseDashboardFilters
          value={filter}
          onChange={setFilter}
          onReset={() => setFilter(EMPTY_FILTER)}
        />

        <ExpenseDashboardKpis data={dashboard} currency={currency} loading={loading} />

        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <ExpenseBreakdownCard
            title={t('finance.expenseDashboard.byCategory')}
            slices={dashboard?.by_category ?? []}
            currency={currency}
            labelOf={categories.labelOf}
          />
          <ExpenseBreakdownCard
            title={t('finance.expenseDashboard.byRelatedType')}
            slices={dashboard?.by_related_type ?? []}
            currency={currency}
            labelOf={relatedTypes.labelOf}
          />
          <ExpenseBreakdownCard
            title={t('finance.expenseDashboard.byCompensationMethod')}
            slices={dashboard?.by_compensation_method ?? []}
            currency={currency}
            labelOf={methods.labelOf}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
