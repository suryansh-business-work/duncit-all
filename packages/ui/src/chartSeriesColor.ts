import type { Theme } from '@mui/material/styles';

/**
 * The first three categorical slots of the validated reference palette, stepped
 * per theme. Three is the cap on purpose: those three clear the colour-vision
 * checks against EVERY other slot in both modes, so no console chart ever needs
 * a fourth series (split it into another chart instead).
 */
const SERIES = {
  light: ['#2a78d6', '#eb6834', '#1baf7a'],
  dark: ['#3987e5', '#d95926', '#199e70'],
} as const;

/** The colour of series `index` in a console chart, for the active theme mode. */
export const chartSeriesColor = (theme: Theme, index: number): string =>
  SERIES[theme.palette.mode === 'dark' ? 'dark' : 'light'][index % 3];
