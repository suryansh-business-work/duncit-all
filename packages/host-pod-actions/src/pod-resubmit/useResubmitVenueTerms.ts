import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { offerGuestFloor, venueSpaces } from '@duncit/utils';

/** The picked venue's bounds on an offer: what its spaces hold and the fewest guests it takes. */
export const RESUBMIT_VENUE_TERMS = gql`
  query HostResubmitVenueTerms($venue_id: ID!) {
    publicVenue(venue_id: $venue_id) {
      id
      capacity
      capacity_items {
        label
        capacity
      }
      offer_min_guests
    }
  }
`;

interface TermsAnswer {
  publicVenue: {
    id: string;
    capacity?: number | null;
    capacity_items?: { label: string; capacity: number }[] | null;
    offer_min_guests?: number | null;
  } | null;
}

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
 * offered to is read on its own. Mirrors @duncit/pod-form's useVenueOfferTerms.
 */
export function useResubmitVenueTerms(venueId: string, spaceLabel: string): ResubmitVenueTerms {
  const { data } = useQuery<TermsAnswer>(RESUBMIT_VENUE_TERMS, {
    variables: { venue_id: venueId },
    skip: !venueId,
    fetchPolicy: 'cache-first',
  });
  // Skipped is no venue at all, whatever an earlier answer left behind.
  const venue = venueId ? data?.publicVenue : null;
  // The named space's capacity, else (the whole venue) the venue's own.
  const space = venueSpaces(venue).find((item) => item.slotSpaceLabel === spaceLabel);
  const capacity = Math.max(0, Math.floor(Number(space?.capacity ?? venue?.capacity) || 0));
  return { minGuests: offerGuestFloor(venue?.offer_min_guests, capacity), capacity };
}
