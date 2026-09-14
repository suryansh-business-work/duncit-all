import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import type { Theme } from '@mui/material/styles';

/**
 * Registered ONCE for every chart on the run page. Chart.js keeps a global
 * registry, so a chart registering its own list could render blank because the
 * element it needed belonged to a sibling that had not mounted yet.
 */
ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler);

/**
 * The first three categorical slots of the validated reference palette, stepped
 * per theme. Three is the cap on purpose: those three clear the colour-vision
 * checks against EVERY other slot in both modes, so no chart here ever needs a
 * fourth series (split it into another chart instead).
 */
const SERIES = {
  light: ['#2a78d6', '#eb6834', '#1baf7a'],
  dark: ['#3987e5', '#d95926', '#199e70'],
} as const;

export const seriesColor = (theme: Theme, index: number): string =>
  SERIES[theme.palette.mode === 'dark' ? 'dark' : 'light'][index % 3];
