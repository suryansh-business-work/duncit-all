import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, AlertTitle, Button, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitDashboard } from '@duncit/dashboard';
import { Loader, PageHeader, TopProgressBar } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { buildAnalyticsWidgets } from './widgets';
import { DEFAULT_PERIOD, ENTITY_ANALYTICS, PERIOD_OPTIONS } from './queries';
import type { AnalyticsPageSpec } from './pages';

function PeriodToggle({ value, onChange }: Readonly<{ value: number; onChange: (days: number) => void }>) {
  const { t } = useTranslation();
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      onChange={(_event, next: number | null) => {
        if (next) onChange(next);
      }}
      aria-label={t('analytics.page.period')}
    >
      {PERIOD_OPTIONS.map((option) => (
        <ToggleButton key={option.days} value={option.days} data-testid={`analytics-period-${option.days}`}>
          {t(option.label)}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/**
 * One Analytics dashboard — Users, Pods, Clubs, Club Admins or Hosts — on the
 * shared dashboard grid. The title and the period sit above the grid and never
 * move; every number, chart and ranking below is a widget the reader can
 * rearrange. Changing the period keeps the last numbers on screen under a
 * progress bar rather than blanking the grid.
 */
export default function EntityAnalyticsPage({ page }: Readonly<{ page: AnalyticsPageSpec }>) {
  const { t } = useTranslation();
  const [days, setDays] = useState(DEFAULT_PERIOD);
  const { data, previousData, loading, error, refetch } = useQuery(ENTITY_ANALYTICS, {
    variables: { entity: page.entity, days },
    fetchPolicy: 'cache-and-network',
  });
  const board = data?.entityAnalytics ?? previousData?.entityAnalytics;
  const widgets = useMemo(() => (board ? buildAnalyticsWidgets(board, t) : []), [board, t]);
  const retry = () => {
    refetch().catch(() => undefined);
  };
  const testId = `analytics-page-${page.path.slice(1).replaceAll('/', '-')}`;
  const periodToggle = page.periodless ? undefined : <PeriodToggle value={days} onChange={setDays} />;

  const header = (
    <Stack spacing={2}>
      <TopProgressBar busy={loading && Boolean(board)} />
      <PageHeader title={t(page.title)} subtitle={t(page.subtitle)} actions={periodToggle} />
      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={retry}>
              {t('analytics.page.retry')}
            </Button>
          }
        >
          <AlertTitle>{t('analytics.page.loadFailed')}</AlertTitle>
          {parseApiError(error)}
        </Alert>
      )}
    </Stack>
  );

  if (!board) {
    return (
      <Stack spacing={3} data-testid={testId}>
        {header}
        {loading && <Loader variant="page" />}
      </Stack>
    );
  }

  return (
    <Stack data-testid={testId}>
      <DuncitDashboard dashboardId={page.dashboardId} header={header} widgets={widgets} />
    </Stack>
  );
}
