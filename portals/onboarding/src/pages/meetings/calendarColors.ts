import type { OnboardingMeeting } from './queries';

/** Onboarding calendar / slot-picker palette (matches the agreed spec). */
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
  today: '#DBEAFE',
  weekend: '#F8FAFC',
  working: '#FFFFFF',
  nonWorking: '#F1F5F9',
} as const;

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
