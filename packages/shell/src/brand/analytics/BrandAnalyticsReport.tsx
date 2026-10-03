import { Alert, Stack, Typography } from '@mui/material';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '../../i18n/useTranslation';
import { KpiTiles } from './KpiTiles';
import { TopProductsTable } from './TopProductsTable';
import { TrendBars } from './TrendBars';
import type { BrandAnalytics } from './queries';

export interface BrandAnalyticsReportProps {
  /** One `brandAnalytics` answer, as the server sends it. */
  analytics: BrandAnalytics;
}

/**
 * The analytics body over data already in hand — tiles, the daily strip and
 * the best sellers. `BrandAnalyticsPanel` fetches and wraps it; it is exported
 * on its own so a demo or a print view can render a known answer.
 */
export function BrandAnalyticsReport({ analytics }: Readonly<BrandAnalyticsReportProps>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={3}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="brand-analytics-since">
        {t('shell.brandConsole.analyticsSince', { vars: { date: formatDate(analytics.since) } })}
      </Typography>
      {analytics.orders === 0 && (
        <Alert severity="info" data-testid="brand-analytics-empty">
          {t('shell.brandConsole.analyticsEmpty', { vars: { days: analytics.days } })}
        </Alert>
      )}
      <KpiTiles analytics={analytics} />
      <TrendBars analytics={analytics} />
      <TopProductsTable analytics={analytics} />
    </Stack>
  );
}
