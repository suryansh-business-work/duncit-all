import { useMemo } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ChartData, ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { chartSeriesColor } from '@duncit/ui';
import { sliceLabel } from './slice-label';
import { formatValue } from './format';
import { categoryAxis, chartTooltip, valueAxis } from './chart-theme';
import type { AnalyticsBreakdown } from './queries';

type Slice = AnalyticsBreakdown['slices'][number];

/** Says what a breakdown counts over: everything so far, or its top ten. Nothing for the period itself. */
export function ScopeChip({ breakdown }: Readonly<{ breakdown: AnalyticsBreakdown }>) {
  const { t } = useTranslation();
  if (breakdown.scope === 'ALL_TIME') return <Chip size="small" variant="outlined" label={t('analytics.page.allTime')} />;
  if (breakdown.slices.some((slice) => slice.label)) {
    return <Chip size="small" variant="outlined" label={t('analytics.breakdown.topTen')} />;
  }
  return null;
}

/**
 * One number split by something about it. Slices with a natural order (hours,
 * bands, stars) stand as columns in that order; everything else lies as
 * horizontal bars, largest first, so long names stay readable. The widget
 * around it carries the title.
 */
export default function BreakdownChart({ breakdown, label }: Readonly<{ breakdown: AnalyticsBreakdown; label: string }>) {
  const { t, locale } = useTranslation();
  const { formatClock } = useDateFormat();
  const theme = useTheme();
  const horizontal = !breakdown.ordered;

  const slices = useMemo<Slice[]>(() => {
    if (!horizontal) return breakdown.slices;
    // A copy: the slices belong to Apollo's cache and must not be reordered in place.
    const sorted = [...breakdown.slices];
    sorted.sort((a, b) => b.value - a.value);
    return sorted;
  }, [breakdown.slices, horizontal]);
  const empty = slices.every((slice) => slice.value === 0);

  const data = useMemo<ChartData<'bar'>>(
    () => ({
      labels: slices.map((slice) => sliceLabel(breakdown.key, slice, { t, formatClock, locale })),
      datasets: [
        {
          label,
          data: slices.map((slice) => slice.value),
          backgroundColor: chartSeriesColor(theme, 0),
          borderRadius: 4,
          borderSkipped: 'start',
          maxBarThickness: 28,
        },
      ],
    }),
    [slices, breakdown.key, t, formatClock, locale, label, theme]
  );

  const options = useMemo<ChartOptions<'bar'>>(() => {
    const valueScale = valueAxis(theme, (value) => formatValue(value, breakdown.format));
    const labelScale = categoryAxis(theme, horizontal ? 10 : 12);
    return {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...chartTooltip(theme),
          callbacks: {
            label: (item) => formatValue(horizontal ? item.parsed.x : item.parsed.y, breakdown.format),
          },
        },
      },
      scales: horizontal ? { x: valueScale, y: labelScale } : { x: labelScale, y: valueScale },
    };
  }, [theme, horizontal, breakdown.format]);

  const height = horizontal ? Math.max(160, slices.length * 30 + 40) : 240;

  return (
    <Box sx={{ height, position: 'relative' }} data-testid={`analytics-breakdown-${breakdown.key}`}>
      {empty ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', pt: 2 }}>
          {t('analytics.page.noData')}
        </Typography>
      ) : (
        <Bar data={data} options={options} role="img" aria-label={label} />
      )}
    </Box>
  );
}
