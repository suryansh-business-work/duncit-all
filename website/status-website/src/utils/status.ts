import type { Theme } from '@mui/material/styles';
import type { DayState, ServiceState } from '../types';

/** Bar/dot colour for a single day's state. */
export function dayStateColor(state: DayState, theme: Theme): string {
  switch (state) {
    case 'operational':
      return theme.palette.success.main;
    case 'degraded':
      return theme.palette.warning.main;
    case 'partial_outage':
      return theme.palette.warning.dark;
    default:
      return theme.palette.error.main;
  }
}

/** Colour for a service's live state (adds down / nodata to the day states). */
export function serviceStateColor(state: ServiceState, theme: Theme): string {
  if (state === 'down') return theme.palette.error.main;
  if (state === 'nodata') return theme.palette.text.disabled;
  return dayStateColor(state, theme);
}

const LABELS: Record<ServiceState, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  partial_outage: 'Partial outage',
  major_outage: 'Major outage',
  down: 'Down',
  nodata: 'No data',
};

export function stateLabel(state: ServiceState): string {
  return LABELS[state];
}

export type ChipColor = 'success' | 'warning' | 'error' | 'default';

export function stateChipColor(state: ServiceState): ChipColor {
  if (state === 'operational') return 'success';
  if (state === 'degraded' || state === 'partial_outage') return 'warning';
  if (state === 'nodata') return 'default';
  return 'error';
}

/** True when a service is anything other than fully operational. */
export function hasIssue(state: ServiceState): boolean {
  return state !== 'operational' && state !== 'nodata';
}
