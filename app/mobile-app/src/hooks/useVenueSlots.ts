import { useCallback, useEffect, useState } from 'react';

import { VenueAvailableSlotsDocument } from '@/graphql/create-pod';
import { graphqlRequest } from '@/services/graphql.client';
import type { CreatePodSlot } from '@/components/create-pod';
import { useRefreshRegistration } from '@/components/PullToRefresh';

/** Open availability slots on a venue partner's calendar (create-pod step 3).
 * Refetches whenever the picked venue changes; empty venue = no request. */
export function useVenueSlots(venueId: string) {
  const [slots, setSlots] = useState<CreatePodSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!venueId) {
      setSlots([]);
      return undefined;
    }
    let active = true;
    setIsLoading(true);
    graphqlRequest(VenueAvailableSlotsDocument, { venue_id: venueId }, { auth: true })
      .then((res) => {
        if (active) setSlots(res.venueAvailableSlots ?? []);
      })
      .catch(() => {
        if (active) setSlots([]);
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [venueId, attempt]);

  useRefreshRegistration(refetch);

  return { slots, isLoading };
}
