import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import type { VenueOfferModel } from '@/generated/graphql/graphql';
import {
  ApproveVenueSlotRequestDocument,
  CounterVenueOfferDocument,
  DeclineVenueSlotRequestDocument,
  VenueSlotRequestsDocument,
} from '@/graphql/venue-slot-requests';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';
import { useSelectedVenue } from '@/hooks/useSelectedVenue';
import { useTranslation } from '@/hooks/useTranslation';

type Data = ResultOf<typeof VenueSlotRequestsDocument>;
export type SlotRequestRow = Data['venueSlotRequests'][number];
export type OwnedVenue = Data['myVenues'][number];
export type BookingOffer = NonNullable<SlotRequestRow['offer']>;

/** The terms a counter carries — the codegen's enum, from the shared form's string. */
export interface CounterTerms {
  model: string;
  rate: number;
}

/** Both lists come back in one round trip, so the filter has its options. */
export const ALL_VENUES = 'ALL';

/**
 * Booking requests — the RN twin of mWeb's venue-slot-requests-page: list,
 * accept, reject and counter a host's offer.
 *
 * A decision is refetched rather than patched into local state: approving a
 * slot changes the pod's status server-side, and a list that guessed at that
 * would show a stale row the next person to look would not.
 */
export function useVenueSlotRequests() {
  const { t } = useTranslation();
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
        setFeedback({
          ok: false,
          text: err instanceof Error ? err.message : t('availability.offers.failed'),
        });
      } finally {
        setBusy(false);
      }
    },
    [load, t],
  );

  const approve = useCallback(
    (slotId: string) =>
      decide(
        graphqlRequest(ApproveVenueSlotRequestDocument, { slot_id: slotId }, { auth: true }),
        t('availability.offers.done.accepted'),
      ),
    [decide, t],
  );

  const decline = useCallback(
    (slotId: string, reason: string) =>
      decide(
        graphqlRequest(
          DeclineVenueSlotRequestDocument,
          { slot_id: slotId, reason: reason || null },
          { auth: true },
        ),
        t('availability.offers.done.rejected'),
      ),
    [decide, t],
  );

  const counter = useCallback(
    (slotId: string, terms: CounterTerms, note: string) =>
      decide(
        graphqlRequest(
          CounterVenueOfferDocument,
          {
            slot_id: slotId,
            terms: { model: terms.model as VenueOfferModel, rate: terms.rate },
            note: note || null,
          },
          { auth: true },
        ),
        t('availability.offers.done.countered'),
      ),
    [decide, t],
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
    counter,
    refetch: load,
  };
}
