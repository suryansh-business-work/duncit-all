import type { PodStatusFields } from '@duncit/utils';

/**
 * The fields of `ClubAdminPodRowFields` (@duncit/pod-form) this list reads.
 * The status chip derives from the four `PodStatusFields`; the rest is what a
 * row shows.
 */
export interface ClubAdminPodRow extends PodStatusFields {
  id: string;
  pod_title: string;
  pod_date_time: string | null;
  pod_attendees: string[];
  no_of_spots: number;
  /** Where the pod sits — a row used to say only when it was, so an admin had
   * to open every pod to triage a list. */
  place_label: string | null;
  /** FREE reads as "Free", never as a zero price — the same rule every other
   * pod row on both surfaces applies. */
  pod_type: 'FREE' | 'PAID';
  pod_amount: number;
  /** Seats marked present against seats booked — what the host is PAID on.
   * `recorded` false means nobody scanned, which is not the same as nobody
   * came, so the row says so rather than showing a confident 0. */
  attendance: { attended_seats: number; booked_seats: number; recorded: boolean };
}
