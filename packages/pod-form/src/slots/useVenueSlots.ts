import { useMemo } from 'react';
import { gql, useQuery } from '@apollo/client';

export const VENUE_AVAILABLE_SLOTS = gql`
  query VenueAvailableSlotsForPicker($venue_id: ID!, $from: String) {
    venueAvailableSlots(venue_id: $venue_id, from: $from) {
      id
      start_at
      end_at
      notes
      price
      space_label
      # Guests the booked space holds — the ceiling on the pod's spots.
      capacity
    }
  }
`;

/** Mirrors the server's `VenueSlot`, where every field below is non-null. */
export interface VenueSlot {
  id: string;
  start_at: string;
  end_at: string;
  notes: string;
  price: number;
  /** '' means the whole venue rather than a named space. */
  space_label: string;
  /** 0 = unset/whole venue. */
  capacity: number;
}

/**
 * The venue's bookable slots — ONE query for the whole form.
 *
 * The picker and `useSpotsBounds` both need this list. They used to issue their
 * own `useQuery` with different variables (`{venue_id, from}` vs `{venue_id}`),
 * which Apollo treats as two separate cache entries: two watchers and two round
 * trips for the same data. Routing both through this hook collapses them.
 */
export function useVenueSlots(venueId: string, skip = false) {
  // Stable for the component's life: a `from` that moved every render would
  // change the cache key on every tick and re-fetch forever.
  const fromIso = useMemo(() => new Date().toISOString(), []);
  const { data, loading, error } = useQuery<{ venueAvailableSlots: VenueSlot[] }>(
    VENUE_AVAILABLE_SLOTS,
    {
      variables: { venue_id: venueId, from: fromIso },
      fetchPolicy: 'cache-and-network',
      skip: skip || !venueId,
    },
  );

  return { slots: data?.venueAvailableSlots ?? [], loading, error };
}
