import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ChartData, ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTranslation } from '@duncit/app-settings';
import { categoryAxis, chartSeriesColor, chartTooltip, valueAxis } from '@duncit/ui';
import './chart-setup';

export interface BarSeries {
  label: string;
  values: number[];
}

interface Props {
  labels: string[];
  /** One series, or up to three compared side by side (the palette's cap). */
  series: BarSeries[];
  /** Horizontal bars keep long names (a Page, a post) readable; columns suit ordered slots (hours, days). */
  horizontal?: boolean;
  ariaLabel: string;
  testId: string;
}

/**
 * One measure split by something about it. A single series needs no legend
 * (the card names it); several get one, and each keeps its palette slot.
 */
export default function BarBreakdownChart({ labels, series, horizontal = true, ariaLabel, testId }: Readonly<Props>) {
  const theme = useTheme();
  const { locale } = useTranslation();
  const single = series.length === 1;

  const data = useMemo<ChartData<'bar'>>(
    () => ({
      labels,
      datasets: series.map((bar, index) => ({
        label: bar.label,
        data: bar.values,
        backgroundColor: chartSeriesColor(theme, index),
        borderRadius: 4,
        borderSkipped: 'start',
        maxBarThickness: 28,
      })),
    }),
    [labels, series, theme]
  );

  const options = useMemo<ChartOptions<'bar'>>(() => {
    const values = valueAxis(theme, (value) => value.toLocaleString(locale));
    const categories = categoryAxis(theme, horizontal ? 10 : 12);
    return {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          display: !single,
          position: 'top',
          align: 'start',
          labels: { color: theme.palette.text.secondary, boxWidth: 10, boxHeight: 10, usePointStyle: true },
        },
        tooltip: chartTooltip(theme),
      },
      scales: horizontal ? { x: values, y: categories } : { x: categories, y: values },
    };
  }, [theme, locale, horizontal, single]);

  const height = horizontal ? Math.max(160, labels.length * series.length * 26 + 50) : 240;

  return (
    <Box sx={{ height, position: 'relative' }} data-testid={testId}>
      <Bar data={data} options={options} role="img" aria-label={ariaLabel} />
    </Box>
  );
}
