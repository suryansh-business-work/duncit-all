import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ChartData, ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTranslation } from '@duncit/app-settings';
import { categoryAxis, chartTooltip, lineTrendDataset, lineTrendOptions, valueAxis } from '@duncit/ui';
import './chart-setup';

export interface TrendSeries {
  label: string;
  values: (number | null)[];
}

interface Props {
  labels: string[];
  /** At most three — the validated palette's cap; a fourth measure is another chart. */
  series: TrendSeries[];
  ariaLabel: string;
  testId: string;
}

/**
 * One measure over the period on a single value axis, drawn with the shared
 * trend frame from @duncit/ui. Gaps in a series (a day the network reported
 * nothing) are bridged rather than dropped to zero.
 */
export default function LineTrendChart({ labels, series, ariaLabel, testId }: Readonly<Props>) {
  const theme = useTheme();
  const { locale } = useTranslation();
  const single = series.length === 1;

  const data = useMemo<ChartData<'line'>>(
    () => ({
      labels,
      datasets: series.map((line, index) => ({
        label: line.label,
        data: line.values,
        spanGaps: true,
        ...lineTrendDataset(theme, index, single),
      })),
    }),
    [labels, series, theme, single]
  );

  const options = useMemo<ChartOptions<'line'>>(() => {
    const base = lineTrendOptions(theme, single);
    return {
      ...base,
      plugins: { ...base.plugins, tooltip: chartTooltip(theme) },
      scales: {
        x: categoryAxis(theme),
        y: valueAxis(theme, (value) => value.toLocaleString(locale)),
      },
    };
  }, [theme, single, locale]);

  return (
    <Box sx={{ height: 260, position: 'relative' }} data-testid={testId}>
      <Line data={data} options={options} role="img" aria-label={ariaLabel} />
    </Box>
  );
}
