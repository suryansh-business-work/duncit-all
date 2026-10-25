import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';
import { offerGuestFloor, venueSpaces } from '@duncit/utils';

import { ResubmitVenueTermsDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';

type TermsVenue = NonNullable<ResultOf<typeof ResubmitVenueTermsDocument>['publicVenue']>;

export interface ResubmitVenueTerms {
  /**
   * The fewest guests the offer may be for: the venue's minimum (its setting,
   * else the platform's default), never more than the space holds — the
   * server's `openingMinGuests`. 0 while unknown.
   */
  minGuests: number;
  /** What the offered space holds; 0 while unknown or unset. */
  capacity: number;
}

/**
 * The bounds of a new offer to `venueId` for `spaceLabel` ('' = the whole
 * venue). The venue picker's list carries neither, so the one venue being
 * offered to is read on its own; a failed read leaves the spots unbounded
 * (the server still refuses an offer outside them). mWeb twin:
 * @duncit/host-pod-actions useResubmitVenueTerms.
 */
export function useResubmitVenueTerms(venueId: string, spaceLabel: string): ResubmitVenueTerms {
  const [venue, setVenue] = useState<TermsVenue | null>(null);

  useEffect(() => {
    // Another venue's bounds never apply to this one, even for a moment.
    setVenue(null);
    if (!venueId) return undefined;
    let active = true;
    graphqlRequest(ResubmitVenueTermsDocument, { venue_id: venueId }, { auth: true })
      .then((res) => {
        if (active) setVenue(res.publicVenue ?? null);
      })
      .catch((error: unknown) =>
        logs.mobileApp.warn('useResubmitVenueTerms', 'load', { error, venue_id: venueId }),
      );
    return () => {
      active = false;
    };
  }, [venueId]);

  // The named space's capacity, else (the whole venue) the venue's own.
  const space = venueSpaces(venue).find((item) => item.slotSpaceLabel === spaceLabel);
  const capacity = Math.max(0, Math.floor(Number(space?.capacity ?? venue?.capacity) || 0));
  return { minGuests: offerGuestFloor(venue?.offer_min_guests, capacity), capacity };
}
