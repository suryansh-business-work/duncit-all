import { alpha, type Theme } from '@mui/material';
import type { OnboardingMeeting } from './queries';

/** Onboarding calendar / slot-picker status palette (vivid; works in both themes). */
export const CAL = {
  available: '#22C55E',
  selected: '#2563EB',
  booked: '#7C3AED',
  pending: '#F59E0B',
  ongoing: '#0EA5E9',
  completed: '#64748B',
  cancelled: '#EF4444',
  blocked: '#374151',
  nowLine: '#DC2626',
} as const;

/**
 * Theme-aware day-cell / time-band backgrounds. The spec colours are light-mode;
 * deriving them from the MUI palette keeps the calendar readable in dark mode too.
 */
export function calBackgrounds(theme: Theme) {
  const dark = theme.palette.mode === 'dark';
  return {
    today: alpha(theme.palette.primary.main, dark ? 0.24 : 0.12),
    weekend: theme.palette.action.hover,
    working: 'transparent',
    nonWorking: theme.palette.action.disabledBackground,
    holiday: alpha(theme.palette.warning.main, dark ? 0.22 : 0.14),
    outOfMonth: theme.palette.action.hover,
  };
}

export type DisplayStatus = 'PENDING' | 'BOOKED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

const STATUS_META: Record<DisplayStatus, { color: string; label: string }> = {
  PENDING: { color: CAL.pending, label: 'Pending confirmation' },
  BOOKED: { color: CAL.booked, label: 'Confirmed' },
  ONGOING: { color: CAL.ongoing, label: 'In progress' },
  COMPLETED: { color: CAL.completed, label: 'Completed' },
  CANCELLED: { color: CAL.cancelled, label: 'Cancelled' },
};

export const ALL_DISPLAY_STATUSES: DisplayStatus[] = ['PENDING', 'BOOKED', 'ONGOING', 'COMPLETED', 'CANCELLED'];

export const statusMeta = (s: DisplayStatus) => STATUS_META[s];

/** The instant a meeting effectively occupies (scheduled time wins). */
export const eventStart = (m: OnboardingMeeting) => new Date(m.scheduled_at ?? m.requested_at);

/** Map a meeting to its Outlook-style display status given the slot length + now. */
export function displayStatus(m: OnboardingMeeting, slotMinutes: number, now: number): DisplayStatus {
  if (m.status === 'CANCELLED') return 'CANCELLED';
  if (m.status === 'DONE') return 'COMPLETED';
  if (m.status === 'SCHEDULED') {
    const start = eventStart(m).getTime();
    const end = start + slotMinutes * 60_000;
    if (now >= start && now < end) return 'ONGOING';
    if (now >= end) return 'COMPLETED';
    return 'BOOKED';
  }
  return 'PENDING';
}
