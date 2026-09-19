import { alpha, type Theme } from '@mui/material/styles';
import { chartSeriesColor } from './chartSeriesColor';

/**
 * The quiet frame every console chart shares: recessive grid and axes in the
 * theme's own ink, a tooltip on the paper surface. Plain option objects, so
 * this package needs no Chart.js of its own — each portal registers the
 * elements it draws and spreads these into its options.
 */
export function chartTooltip(theme: Theme) {
  return {
    backgroundColor: theme.palette.background.paper,
    titleColor: theme.palette.text.primary,
    bodyColor: theme.palette.text.primary,
    borderColor: theme.palette.divider,
    borderWidth: 1,
    padding: 10,
  };
}

/** The value axis — starts at zero, a few ticks, gridlines in the divider colour. */
export function valueAxis(theme: Theme, tickFormat: (value: number) => string) {
  return {
    beginAtZero: true,
    grid: { color: theme.palette.divider },
    border: { display: false },
    ticks: {
      color: theme.palette.text.secondary,
      maxTicksLimit: 5,
      precision: 0,
      callback: (value: string | number) => tickFormat(Number(value)),
    },
  };
}

/** The category axis — no gridlines, labels thinned out rather than rotated. */
export function categoryAxis(theme: Theme, maxTicks = 12) {
  return {
    grid: { display: false },
    border: { color: theme.palette.divider },
    ticks: { color: theme.palette.text.secondary, autoSkip: true, maxTicksLimit: maxTicks, maxRotation: 0 },
  };
}

/**
 * How one line of a trend chart is drawn: series `index` of the palette,
 * filled when it is the only line so its shape reads at a glance, a plain
 * line beside others so they can cross without hiding each other.
 */
export function lineTrendDataset(theme: Theme, index: number, single: boolean) {
  const color = chartSeriesColor(theme, index);
  return {
    borderColor: color,
    backgroundColor: single ? alpha(color, 0.12) : color,
    fill: single,
    borderWidth: 2,
    tension: 0.3,
    pointRadius: 0,
    pointHoverRadius: 4,
    pointHitRadius: 12,
  };
}

/**
 * The options every trend line shares: fills its box, no animation, one
 * tooltip per x index, and a legend only when there is more than one line
 * (a lone line is named by the card around it). Spread it, then add the
 * tooltip and scales the chart formats itself.
 */
export function lineTrendOptions(theme: Theme, single: boolean) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        display: !single,
        position: 'top' as const,
        align: 'start' as const,
        labels: { color: theme.palette.text.secondary, boxWidth: 10, boxHeight: 10, usePointStyle: true },
      },
    },
  };
}
