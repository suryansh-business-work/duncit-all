import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  ApproveVenueSlotRequestDocument,
  DeclineVenueSlotRequestDocument,
  VenueSlotRequestsDocument,
} from '@/graphql/venue-slot-requests';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';
import { useSelectedVenue } from '@/hooks/useSelectedVenue';

type Data = ResultOf<typeof VenueSlotRequestsDocument>;
export type SlotRequestRow = Data['venueSlotRequests'][number];
export type OwnedVenue = Data['myVenues'][number];

/** Both lists come back in one round trip, so the filter has its options. */
export const ALL_VENUES = 'ALL';

/**
 * Slot Requests — the RN twin of mWeb's venue-slot-requests-page.
 *
 * A decision is refetched rather than patched into local state: approving a
 * slot changes the pod's status server-side, and a list that guessed at that
 * would show a stale row the next person to look would not.
 */
export function useVenueSlotRequests() {
  const [venues, setVenues] = useState<OwnedVenue[]>([]);
  // The screen opens on the venue picked on any Venue Studio screen; "All
  // venues" stays one tap away, and picking a venue here moves that shared pick.
  const [showAll, setShowAll] = useState(false);
  const { venueId: selectedId, selectVenue } = useSelectedVenue(venues);
  const venueId = showAll || !selectedId ? ALL_VENUES : selectedId;
  const setVenueId = useCallback(
    (id: string) => {
      setShowAll(id === ALL_VENUES);
      if (id !== ALL_VENUES) selectVenue(id);
    },
    [selectVenue],
  );
  const [requests, setRequests] = useState<SlotRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await graphqlRequest(
      VenueSlotRequestsDocument,
      { venue_id: venueId === ALL_VENUES ? null : venueId },
      { auth: true },
    );
    setVenues(res.myVenues ?? []);
    setRequests(res.venueSlotRequests ?? []);
  }, [venueId]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    load()
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  useRefreshRegistration(load);

  const decide = useCallback(
    async (run: Promise<unknown>, done: string) => {
      setBusy(true);
      try {
        await run;
        setFeedback({ ok: true, text: done });
        await load();
      } catch (err) {
        setFeedback({ ok: false, text: err instanceof Error ? err.message : 'That did not work' });
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const approve = useCallback(
    (slotId: string) =>
      decide(
        graphqlRequest(ApproveVenueSlotRequestDocument, { slot_id: slotId }, { auth: true }),
        'Booking approved — the pod is now live.',
      ),
    [decide],
  );

  const decline = useCallback(
    (slotId: string, reason: string) =>
      decide(
        graphqlRequest(
          DeclineVenueSlotRequestDocument,
          { slot_id: slotId, reason: reason || null },
          { auth: true },
        ),
        'Booking declined — the slot is open again.',
      ),
    [decide],
  );

  return {
    venueId,
    setVenueId,
    venues,
    requests,
    isLoading,
    busy,
    feedback,
    clearFeedback: () => setFeedback(null),
    approve,
    decline,
    refetch: load,
  };
}
