import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import StatusChip from './StatusChip';
import { STORE_LABEL } from './tabs';
import type { AppInsightIntegration } from './queries';

/**
 * One store's integration at a glance: its state, when it last synced, the
 * days the history holds, and — after a failure — the store's own reason.
 * The reason is announced as it appears (role="status"), since a sync ends
 * while the reader is looking elsewhere.
 */
export default function IntegrationCard({ integration }: Readonly<{ integration: AppInsightIntegration }>) {
  const { t } = useTranslation();
  const { formatDateTime, formatDate } = useDateFormat();
  const id = integration.store.toLowerCase().replaceAll('_', '-');
  const lastSync = integration.last_success_at
    ? t('analytics.appInsights.lastSync', { vars: { when: formatDateTime(integration.last_success_at) } })
    : t('analytics.appInsights.neverSynced');
  const coverage =
    integration.first_day && integration.last_day
      ? t('analytics.appInsights.coverage', {
          vars: { from: formatDate(integration.first_day), to: formatDate(integration.last_day) },
        })
      : t('analytics.appInsights.noData');

  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 0 }} data-testid={`app-insights-integration-${id}`}>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" component="h2">
              {t(STORE_LABEL[integration.store])}
            </Typography>
            <StatusChip status={integration.status} testId={`app-insights-status-${id}`} />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {lastSync}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {coverage}
          </Typography>
          <Typography variant="body2" role="status" sx={{ color: 'error.main', '&:empty': { display: 'none' } }}>
            {integration.status === 'ERROR' ? (integration.last_error ?? '') : ''}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
