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
}
