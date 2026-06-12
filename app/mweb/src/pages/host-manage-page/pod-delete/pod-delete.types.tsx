/** Shared types + reason subjects for the host's delete-pod flow (2B).
 * The subjects mirror the server's POD_DELETE_REASON_SUBJECTS list. */

export const POD_DELETE_REASON_SUBJECTS = [
  'Event cancelled',
  'Venue unavailable',
  'Low attendance',
  'Rescheduling',
  'Other',
] as const;

export type PodDeleteReasonSubject = (typeof POD_DELETE_REASON_SUBJECTS)[number];

export interface PodDeleteValues {
  reason_subject: string;
  reason_note: string;
}

export interface PodDeleteImpact {
  other_attendee_count: number;
  refundable_payment_count: number;
  refund_total: number;
  currency_symbol: string;
}

export const blankPodDeleteValues: PodDeleteValues = {
  reason_subject: '',
  reason_note: '',
};
