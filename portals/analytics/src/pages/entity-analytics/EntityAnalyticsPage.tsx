import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, AlertTitle, Button, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitDashboard } from '@duncit/dashboard';
import { Loader, PageHeader, TopProgressBar } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { buildAnalyticsWidgets } from './widgets';
import { ENTITY_ANALYTICS } from './queries';
import { initialPeriod, periodVariables, type PeriodState } from './period-state';
import PageControls from './PageControls';
import type { AnalyticsPageSpec } from './pages';

interface Props {
  page: AnalyticsPageSpec;
  /** Above the note, under the heading — a page's own strip (App Insights' status cards and tabs). */
  intro?: ReactNode;
  /** After the period controls (App Insights' Sync now). */
  actions?: ReactNode;
  /** Under the grid, given the period on screen (App Insights' data tables). */
  footer?: (period: PeriodState) => ReactNode;
}

/**
 * One Analytics dashboard — Users, Pods, Clubs, Club Admins or Hosts — on the
 * shared dashboard grid. The title and the period sit above the grid and never
 * move; every number, chart and ranking below is a widget the reader can
 * rearrange. Changing the period keeps the last numbers on screen under a
 * progress bar rather than blanking the grid.
 */
export default function EntityAnalyticsPage({ page, intro, actions, footer }: Readonly<Props>) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState(initialPeriod);
  const { data, previousData, loading, error, refetch } = useQuery(ENTITY_ANALYTICS, {
    variables: { entity: page.entity, ...periodVariables(period) },
    fetchPolicy: 'cache-and-network',
  });
  const board = data?.entityAnalytics ?? previousData?.entityAnalytics;
  const widgets = useMemo(() => (board ? buildAnalyticsWidgets(board, t) : []), [board, t]);
  const retry = () => {
    refetch().catch(() => undefined);
  };
  const testId = `analytics-page-${page.path.slice(1).replaceAll('/', '-')}`;
  const pageControls = (
    <PageControls
      value={period}
      onChange={setPeriod}
      periodless={page.periodless}
      cityFilter={page.cityFilter}
      platformFilter={page.platformFilter}
      detailsUrl={board?.details_url}
    />
  );
  // Only a page with actions of its own gets the wrapper; every other dashboard's header is unchanged.
  const controls = actions ? (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} sx={{ alignItems: { lg: 'center' } }}>
      {pageControls}
      {actions}
    </Stack>
  ) : (
    pageControls
  );

  const header = (
    <Stack spacing={2}>
      <TopProgressBar busy={loading && Boolean(board)} />
      <PageHeader title={t(page.title)} subtitle={t(page.subtitle)} actions={controls} />
      {intro}
      {page.note && <Alert severity="info">{t(page.note)}</Alert>}
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
    <Stack spacing={3} data-testid={testId}>
      <DuncitDashboard dashboardId={page.dashboardId} header={header} widgets={widgets} />
      {footer?.(period)}
    </Stack>
  );
}
