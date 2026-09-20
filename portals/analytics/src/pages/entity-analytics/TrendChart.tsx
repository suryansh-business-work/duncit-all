import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ChartData, ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatDay, useTranslation } from '@duncit/app-settings';
import { lineTrendDataset, lineTrendOptions } from '@duncit/ui';
import { KPI_COPY, SERIES_COPY } from './copy';
import { formatValue } from './format';
import { categoryAxis, chartTooltip, valueAxis } from './chart-theme';
import type { AnalyticsTrend } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

function seriesLabel(key: string, t: Translate): string {
  const own = SERIES_COPY[key];
  if (own) return t(own);
  const tile = KPI_COPY[key];
  return tile ? t(tile.title) : key;
}

/**
 * One measure over the period, up to three series on a single value axis — a
 * second measure with its own scale gets its own chart instead. The line
 * style and the legend rule are the shared trend frame from @duncit/ui; this
 * chart adds the day labels, the series copy and the measure's own format.
 */
export default function TrendChart({ trend, label }: Readonly<{ trend: AnalyticsTrend; label: string }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const single = trend.series.length === 1;

  const data = useMemo<ChartData<'line'>>(
    () => ({
      labels: trend.buckets.map((bucket) => formatDay(bucket)),
      datasets: trend.series.map((series, index) => ({
        label: seriesLabel(series.key, t),
        data: series.values,
        ...lineTrendDataset(theme, index, single),
      })),
    }),
    [trend, theme, t, single]
  );

  const options = useMemo<ChartOptions<'line'>>(() => {
    const base = lineTrendOptions(theme, single);
    return {
      ...base,
      plugins: {
        ...base.plugins,
        tooltip: {
          ...chartTooltip(theme),
          callbacks: {
            label: (item) => `${item.dataset.label ?? ''}: ${formatValue(item.parsed.y, trend.format)}`,
          },
        },
      },
      scales: {
        x: categoryAxis(theme),
        y: valueAxis(theme, (value) => formatValue(value, trend.format)),
      },
    };
  }, [theme, single, trend.format]);

  return (
    <Box sx={{ height: 260, position: 'relative' }} data-testid={`analytics-trend-${trend.key}`}>
      <Line data={data} options={options} role="img" aria-label={label} />
    </Box>
  );
}
