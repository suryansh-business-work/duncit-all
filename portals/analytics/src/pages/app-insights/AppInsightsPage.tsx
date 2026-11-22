import { Alert, AlertTitle, Box, Button, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import { Loader, PageHeader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import EntityAnalyticsPage from '../entity-analytics/EntityAnalyticsPage';
import type { PeriodState } from '../entity-analytics/period-state';
import ConfigurationRequired from './ConfigurationRequired';
import DailyDataTable from './DailyDataTable';
import IntegrationCard from './IntegrationCard';
import SyncButton from './SyncButton';
import SyncLogTable from './SyncLogTable';
import { periodRange } from './period-range';
import { APP_INSIGHTS_TABS, syncStoreOf, tabSpec, type AppInsightsTab } from './tabs';
import { useAppInsightsStatus } from './useAppInsightsStatus';
import type { AppInsightIntegration } from './queries';

const TAB_PREFIX = 'app-insights';

/**
 * Analytics > App Insights — Google Play Console and App Store Connect
 * statistics, synced daily into Duncit and read from there.
 *
 * Three tabs (Overview, Google Play, App Store), the selection in the URL.
 * Each tab is a regular Analytics dashboard — period presets and custom
 * range, comparison, KPI tiles with growth, trends, breakdowns, a ranking,
 * and the dashboard's own image download — with the stores' status cards and
 * Sync now above it and the stored days (CSV/JSON download) and the sync log
 * below. A tab whose store is not connected shows what to configure instead
 * of numbers.
 */
export default function AppInsightsPage() {
  const { t } = useTranslation();
  const tabs = useTabParam<AppInsightsTab>({
    items: APP_INSIGHTS_TABS.map((tab) => ({ value: tab.value, label: t(tab.label), testId: `app-insights-tab-${tab.value}` })),
    fallback: 'overview',
  });
  const tab = tabSpec(tabs.value);
  const status = useAppInsightsStatus();
  const shown = tab.stores
    .map((store) => status.byStore(store))
    .filter((integration): integration is AppInsightIntegration => integration !== null);
  const connected = shown.filter((integration) => integration.configured);

  const intro = (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        {status.integrations.map((integration) => (
          <IntegrationCard key={integration.store} integration={integration} />
        ))}
      </Stack>
      <DuncitTabs {...tabs} idPrefix={TAB_PREFIX} variant="scrollable" aria-label={t('analytics.appInsights.tabsLabel')} />
    </Stack>
  );

  if (status.loading || status.error) {
    return (
      <Stack spacing={2} data-testid="app-insights-page">
        <PageHeader title={t('analytics.page.appInsights.title')} subtitle={t(tab.page.subtitle)} />
        {status.loading && <Loader variant="page" />}
        {status.error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => status.refetch().catch(() => undefined)}>
                {t('analytics.page.retry')}
              </Button>
            }
          >
            <AlertTitle>{t('analytics.page.loadFailed')}</AlertTitle>
            {parseApiError(status.error)}
          </Alert>
        )}
      </Stack>
    );
  }

  const panel = { ...tabPanelProps(TAB_PREFIX, tab.value), 'data-testid': 'app-insights-page' };

  if (connected.length === 0) {
    return (
      <Box {...panel}>
        <Stack spacing={2}>
          <PageHeader title={t('analytics.page.appInsights.title')} subtitle={t(tab.page.subtitle)} />
          {intro}
          <ConfigurationRequired integrations={shown} />
        </Stack>
      </Box>
    );
  }

  const footer = (period: PeriodState) => {
    const { from, to } = periodRange(period);
    return (
      <Stack spacing={3}>
        {connected.map((integration) => (
          <DailyDataTable key={integration.store} store={integration.store} from={from} to={to} />
        ))}
        <SyncLogTable store={syncStoreOf(tab)} />
      </Stack>
    );
  };

  return (
    <Box {...panel}>
      <EntityAnalyticsPage
        key={tab.value}
        page={tab.page}
        intro={
          <Stack spacing={2}>
            {intro}
            {connected.length < shown.length && (
              <ConfigurationRequired integrations={shown.filter((integration) => !integration.configured)} />
            )}
          </Stack>
        }
        actions={<SyncButton store={syncStoreOf(tab)} disabled={status.syncing} />}
        footer={footer}
      />
    </Box>
  );
}
