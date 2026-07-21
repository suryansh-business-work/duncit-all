import type { MeetingStatus, OnboardingMeeting } from './queries';

const STATUS_LABELS: Record<MeetingStatus, string> = {
  REQUESTED: 'Requested',
  SCHEDULED: 'Scheduled',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

/**
 * Human-cased meeting status for display. A staff rejection (a CANCELLED row with
 * cancelled_by_staff) reads as "Rejected"; a user self-cancel stays "Cancelled".
 * Shared by the meetings table, requester dialog and details drawer so the label
 * is consistent everywhere.
 */
export const meetingStatusLabel = (
  m: Pick<OnboardingMeeting, 'status' | 'cancelled_by_staff'>,
): string =>
  m.status === 'CANCELLED' && m.cancelled_by_staff ? 'Rejected' : STATUS_LABELS[m.status];
