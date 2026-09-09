import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type TooltipItem,
} from 'chart.js';
import type { Theme } from '@mui/material/styles';
import { formatRupees } from '../types';

/**
 * Registered ONCE for every chart on this page.
 *
 * Chart.js keeps a global registry, so each component calling `ChartJS.register`
 * with its own list is three chances for a chart to render blank because the
 * element it needed was registered by a sibling that had not mounted yet.
 */
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

/**
 * The party colours, fixed across every chart on the page.
 *
 * The same money is drawn three ways here, so venue green in the donut has to
 * be venue green in the bars — a reader comparing two charts is comparing the
 * colours, not re-reading the legends.
 */
export const PARTY_COLORS = {
  gst: '#d97706',
  venue: '#059669',
  host: '#2563eb',
  duncit: '#ff4f73',
  expense: '#9333ea',
} as const;

/** Rupees on an axis, short enough to fit: ₹1.2L, ₹45.0k, ₹900. */
export function compactRupees(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

/** Theme-aware tooltip + legend, shared so the three charts cannot drift. */
export const baseOptions = (theme: Theme) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const, labels: { color: theme.palette.text.secondary } },
    tooltip: {
      backgroundColor: theme.palette.background.paper,
      titleColor: theme.palette.text.primary,
      bodyColor: theme.palette.text.primary,
      borderColor: theme.palette.divider,
      borderWidth: 1,
    },
  },
});

/** A money axis pair — used by both bar charts. */
export const moneyScales = (theme: Theme, stacked = false) => ({
  x: {
    stacked,
    grid: { display: false },
    ticks: { color: theme.palette.text.secondary },
  },
  y: {
    stacked,
    // Never `beginAtZero` alone: a venue shortfall drives the host's remainder
    // negative, and an axis clamped at zero would hide the very bar that says so.
    grid: { color: theme.palette.divider },
    ticks: {
      color: theme.palette.text.secondary,
      callback: (value: string | number) => compactRupees(Number(value)),
    },
  },
});

/**
 * Full rupees in the tooltip, whatever the axis had room to print.
 *
 * Deliberately not generic over the chart type: `ChartOptions<T>['plugins']`
 * cannot be indexed on an unresolved T, and the cast that silences that also
 * silences a genuinely wrong plugins block. Returning a plain object instead
 * lets each caller's own `ChartOptions<'bar' | 'doughnut'>` check the spread.
 *
 * A doughnut's `parsed` is the value itself; a bar's is a point, so the label
 * reads whichever this chart has.
 */
export const moneyTooltip = (theme: Theme) => ({
  ...baseOptions(theme).plugins,
  tooltip: {
    ...baseOptions(theme).plugins.tooltip,
    callbacks: {
      label: (ctx: TooltipItem<'bar'> | TooltipItem<'doughnut'>) => {
        // A bar's y is nullable (a gap in the data); a missing value is ₹0
        // rather than a tooltip reading "NaN".
        const value = typeof ctx.parsed === 'number' ? ctx.parsed : (ctx.parsed.y ?? 0);
        const name = ctx.dataset?.label ?? ctx.label ?? '';
        return `${name}: ${formatRupees(value)}`;
      },
    },
  },
});
