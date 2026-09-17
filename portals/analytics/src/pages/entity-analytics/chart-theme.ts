import type { Theme } from '@mui/material/styles';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

// Chart.js keeps one global registry; this is everything the Analytics charts draw.
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip, Legend);

/**
 * The quiet frame every Analytics chart shares: recessive grid and axes in the
 * theme's own ink, a tooltip on the paper surface, no animation.
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
