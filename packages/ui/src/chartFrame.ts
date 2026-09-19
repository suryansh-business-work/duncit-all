import type { Theme } from '@mui/material/styles';

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
