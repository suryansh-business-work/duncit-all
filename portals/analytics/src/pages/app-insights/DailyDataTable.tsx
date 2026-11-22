import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitTable, clientTableFetch } from '@duncit/table';
import { parseApiError } from '@duncit/utils';
import { APP_INSIGHTS_DAILY, type AppInsightDailyRow, type AppInsightDimension, type AppInsightStore } from './queries';
import { dailyColumns, dailySearchOf } from './daily-columns';
import { STORE_LABEL } from './tabs';

interface Props {
  store: AppInsightStore;
  from: string;
  to: string;
}

const DIMENSIONS: ReadonlyArray<{ value: AppInsightDimension; label: string }> = [
  { value: 'TOTAL', label: 'analytics.appInsights.dimension.total' },
  { value: 'COUNTRY', label: 'analytics.appInsights.dimension.country' },
  { value: 'VERSION', label: 'analytics.appInsights.dimension.version' },
];

const getRowId = (row: AppInsightDailyRow) => row.id;

/**
 * The stored days behind the charts, one row per store day (or per country or
 * version of it), over the dashboard's period. The table's own toolbar
 * downloads them as CSV or JSON — the page's export.
 */
export default function DailyDataTable({ store, from, to }: Readonly<Props>) {
  const { t } = useTranslation();
  const [dimension, setDimension] = useState<AppInsightDimension>('TOTAL');
  const { data, error, loading } = useQuery(APP_INSIGHTS_DAILY, {
    variables: { store, from, to, dimension },
    fetchPolicy: 'cache-and-network',
  });
  const columns = useMemo(() => dailyColumns(store, dimension, t), [store, dimension, t]);
  const rows = data?.appInsightsDaily;
  const fetchRows = useMemo(() => clientTableFetch(rows ?? [], dailySearchOf, columns), [rows, columns]);
  const storeName = t(STORE_LABEL[store]);
  const id = store.toLowerCase().replaceAll('_', '-');

  return (
    <Stack spacing={1} data-testid={`app-insights-daily-${id}`}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <Typography variant="h6" component="h2">
          {t('analytics.appInsights.daily.title', { vars: { store: storeName } })}
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={dimension}
          onChange={(_event, next: AppInsightDimension | null) => {
            if (next) setDimension(next);
          }}
          aria-label={t('analytics.appInsights.dimension.label')}
        >
          {DIMENSIONS.map((option) => (
            <ToggleButton key={option.value} value={option.value} data-testid={`app-insights-dimension-${option.value.toLowerCase()}`}>
              {t(option.label)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <DuncitTable<AppInsightDailyRow>
        tableId={`analytics-app-insights-daily-${id}`}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        defaultSort={{ field: 'day', dir: 'desc' }}
        searchPlaceholder={t('analytics.appInsights.daily.search')}
        emptyText={t(loading ? 'analytics.appInsights.daily.loading' : 'analytics.appInsights.daily.empty')}
        ariaLabel={t('analytics.appInsights.daily.title', { vars: { store: storeName } })}
      />
    </Stack>
  );
}
