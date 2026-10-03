import { Box, Stack, Typography } from '@mui/material';
import { formatCount } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { trendBarPercents, trendPeak, type BrandAnalytics } from './queries';

/**
 * Orders per day as plain bars, each scaled to the busiest day. Drawn with Box
 * elements rather than a chart library; the whole strip is ONE image to a
 * screen reader, described by a sentence that carries the same figures.
 */
export function TrendBars({ analytics }: Readonly<{ analytics: BrandAnalytics }>) {
  const { t } = useTranslation();
  const percents = trendBarPercents(analytics.trend);
  const summary = t('shell.brandConsole.trendSummary', {
    vars: {
      days: analytics.days,
      orders: formatCount(analytics.orders),
      peak: formatCount(trendPeak(analytics.trend)),
    },
  });
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" component="h3">
        {t('shell.brandConsole.trendTitle')}
      </Typography>
      <Box
        role="img"
        aria-label={summary}
        data-testid="brand-analytics-trend"
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 0.25,
          height: (theme) => theme.spacing(15),
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {analytics.trend.map((point, index) => (
          <Box
            key={point.date}
            data-testid="brand-analytics-trend-bar"
            sx={{
              flex: 1,
              height: `${percents[index]}%`,
              bgcolor: 'primary.main',
              borderTopLeftRadius: (theme) => theme.shape.borderRadius,
              borderTopRightRadius: (theme) => theme.shape.borderRadius,
            }}
          />
        ))}
      </Box>
    </Stack>
  );
}
