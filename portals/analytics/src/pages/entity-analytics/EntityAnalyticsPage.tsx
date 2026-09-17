import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, AlertTitle, Button, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { Loader, PageHeader, TopProgressBar } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import AnalyticsSections from './AnalyticsSections';
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
 * One Analytics page — Pods, Clubs, Club Admins or Hosts. Changing the period
 * keeps the last numbers on screen under a progress bar rather than blanking
 * the page, so the charts never jump back to a spinner.
 */
export default function EntityAnalyticsPage({ page }: Readonly<{ page: AnalyticsPageSpec }>) {
  const { t } = useTranslation();
  const [days, setDays] = useState(DEFAULT_PERIOD);
  const { data, previousData, loading, error, refetch } = useQuery(ENTITY_ANALYTICS, {
    variables: { entity: page.entity, days },
    fetchPolicy: 'cache-and-network',
  });
  const board = data?.entityAnalytics ?? previousData?.entityAnalytics;
  const retry = () => {
    refetch().catch(() => undefined);
  };

  return (
    <Stack spacing={3} data-testid={`analytics-page-${page.path.slice(1)}`}>
      <TopProgressBar busy={loading && Boolean(board)} />
      <PageHeader
        title={t(page.title)}
        subtitle={t(page.subtitle)}
        actions={<PeriodToggle value={days} onChange={setDays} />}
      />
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
      {!board && loading && <Loader variant="page" />}
      {board && <AnalyticsSections board={board} />}
    </Stack>
  );
}
