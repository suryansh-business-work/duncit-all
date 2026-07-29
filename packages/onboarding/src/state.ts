import type { EarnBoxState, EarnJourney, EarnMeeting } from './types';

/** A meeting the user has booked but not yet had. */
const PENDING = new Set(['REQUESTED', 'SCHEDULED']);
/** A DONE meeting still at NONE/PENDING approval = onboarding under way; the
 * card stays blocked until an admin approves (or denies) the feedback. */
const APPROVAL_IN_PROGRESS = new Set(['NONE', 'PENDING']);
/** Meeting approved but the onboarded record is still under review → the option
 * stays locked; a Rejected record re-opens it. */
const ONBOARDED_UNDER_REVIEW = new Set(['DRAFT', 'SUBMITTED']);

export const IN_PROCESS_LABEL = 'Onboarding in process.';
export const ALREADY_ENABLED_LABEL = 'Already enabled';
export const MEETING_SCHEDULED_LABEL = 'Meeting scheduled';

/** Copy for a card blocked by an open meeting. The request id is included so a
 * user can quote it to support — native used to omit it, which is exactly the
 * drift this shared module exists to prevent. */
export function meetingNotice(meeting: EarnMeeting): string {
  const at = meeting.scheduled_at ?? meeting.requested_at;
  const when = at
    ? new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  const whenSuffix = when ? ` on ${when}` : '';
  const ref = meeting.request_no ? ` (Request ID: ${meeting.request_no})` : '';
  return `You already have an onboarding meeting${ref} scheduled for this${whenSuffix}. Our team will meet you then — this option unlocks once the meeting is done.`;
}

const underReview = (description: string): EarnBoxState => ({
  disabled: true,
  disabledLabel: IN_PROCESS_LABEL,
  description,
  approved: false,
});

/**
 * Resolve one journey card's locked/unlocked state. The single source of truth
 * for mWeb, native and the partner portal — it mirrors the server's
 * `reapplyBlockReason`, which is what actually refuses a duplicate application.
 *
 * Order matters: holding the role wins over any meeting history, because an
 * approved partner may well have an old meeting row.
 */
export function earnBoxState(
  journey: EarnJourney,
  roles: readonly string[],
  meetings: readonly EarnMeeting[],
): EarnBoxState {
  if (roles.includes(journey.role)) {
    return {
      disabled: true,
      disabledLabel: ALREADY_ENABLED_LABEL,
      description: journey.description,
      approved: true,
    };
  }
  const meeting = meetings.find((m) => m.kind === journey.kind);
  if (meeting && PENDING.has(meeting.status)) {
    return {
      disabled: true,
      disabledLabel: MEETING_SCHEDULED_LABEL,
      description: meetingNotice(meeting),
      approved: false,
      scheduledMeeting: meeting,
    };
  }
  const reviewing = `${IN_PROCESS_LABEL} Our team is reviewing your application.`;
  if (meeting?.status === 'DONE' && APPROVAL_IN_PROGRESS.has(meeting.approval_status ?? 'NONE')) {
    return underReview(reviewing);
  }
  if (
    meeting?.status === 'DONE' &&
    meeting.approval_status === 'APPROVED' &&
    ONBOARDED_UNDER_REVIEW.has(meeting.onboarded_status ?? '')
  ) {
    return underReview(reviewing);
  }
  return {
    disabled: false,
    disabledLabel: ALREADY_ENABLED_LABEL,
    description: journey.description,
    approved: false,
  };
}
