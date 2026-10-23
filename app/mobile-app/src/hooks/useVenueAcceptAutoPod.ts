import { useCallback, useEffect, useState } from 'react';
import type { AutoPodLabels } from '@duncit/utils';

import { windowTermsOf, type WindowOffer } from '@/forms/window-offer';
import { AutoPodVenueQuoteDocument, VenueAcceptAutoPodDocument } from '@/graphql/auto-pods';
import type { AutoPodVenueOption } from '@/hooks/useAutoPodVenues';
import type { OfferQuoteAnswer } from '@/hooks/useQuoteRequest';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

/**
 * The venue side of accepting an Auto Pod: a time window the venue is open
 * and free for, and the price terms it charges — priced by the server
 * (`autoPodVenueQuote`, the pod's spots as the guests) and committed with
 * `venueAcceptAutoPod`, which books the window with that price frozen.
 *
 * The venue itself is picked at the top of the queue. A pinned offer only
 * takes a venue from its own city; the server refuses any other, so the sheet
 * says so rather than offering a calendar.
 *
 * The RN twin of `@duncit/auto-pods`' `VenueAcceptDialog` (rule 27).
 */
export function useVenueAcceptAutoPod(
  autoPodId: string | null,
  venue: AutoPodVenueOption | null,
  pinnedLocationId: string | null,
  labels: AutoPodLabels,
  onAccepted: () => void,
) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  const venueId = venue?.id ?? null;
  const venueInCity = !!venue && (!pinnedLocationId || venue.location_id === pinnedLocationId);

  // A fresh offer, or a different venue, is a fresh answer.
  useEffect(() => {
    setFailure('');
  }, [autoPodId, venueId]);

  const priceOf = useCallback(
    async (offer: WindowOffer): Promise<OfferQuoteAnswer> => {
      if (!autoPodId || !venueId) throw new Error('AUTO_POD_QUOTE_WITHOUT_OFFER');
      const res = await graphqlRequest(
        AutoPodVenueQuoteDocument,
        { auto_pod_doc_id: autoPodId, venue_id: venueId, offer: windowTermsOf(offer) },
        { auth: true },
      );
      return res.autoPodVenueQuote;
    },
    [autoPodId, venueId],
  );

  const accept = useCallback(
    async (offer: WindowOffer) => {
      if (!autoPodId || !venueId) return;
      setBusy(true);
      setFailure('');
      try {
        await graphqlRequest(
          VenueAcceptAutoPodDocument,
          { auto_pod_doc_id: autoPodId, venue_id: venueId, offer: windowTermsOf(offer) },
          { auth: true },
        );
        onAccepted();
      } catch (err: unknown) {
        setFailure(toErrorMessage(err, labels.claimedElsewhere));
      } finally {
        setBusy(false);
      }
    },
    [autoPodId, venueId, labels.claimedElsewhere, onAccepted],
  );

  return {
    busy,
    failure,
    priceOf,
    accept,
    /** The offer is pinned to a city this venue is not in. */
    venueInCity,
  };
}
