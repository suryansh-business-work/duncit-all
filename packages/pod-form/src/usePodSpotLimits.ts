import { gql, useQuery } from '@apollo/client';
import type { PodSpotLimits } from '@duncit/utils';

export const POD_SPOT_LIMITS = gql`
  query PodFormSpotLimits($pod_doc_id: ID!) {
    podSpotLimits(pod_doc_id: $pod_doc_id) {
      current
      min
      max
      seats_taken
      venue_capacity
      min_pax
      slidable
      can_decrease
    }
  }
`;

/**
 * How big a pod that ALREADY EXISTS may be resized to.
 *
 * A new pod's ceiling comes from the slot the author is picking, which the
 * picker still has in hand. An existing pod's slot is BOOKED, so
 * `venueAvailableSlots` no longer returns it and the form had nothing to read —
 * which is how Admin > Pod Management ended up offering an uncapped number
 * field on a pod whose space holds thirty. The server answers instead, and the
 * same rules guard the write.
 */
export function usePodSpotLimits(podId: string | null | undefined) {
  const { data } = useQuery<{ podSpotLimits: PodSpotLimits }>(POD_SPOT_LIMITS, {
    variables: { pod_doc_id: podId },
    skip: !podId,
    fetchPolicy: 'cache-and-network',
  });
  return data?.podSpotLimits ?? null;
}
