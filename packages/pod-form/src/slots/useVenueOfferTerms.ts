import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { offerGuestFloor, type VenueMinBusinessRow } from '@duncit/utils';

/**
 * The venue's own bounds on an offer: how many guests its whole space holds,
 * the fewest guests it takes an offer for (its setting, else the platform's
 * default — the server resolves it), and the business it hopes a booking
 * brings (the least an offer may be on each basis). The venues each portal hands
 * the form are its own list and need not carry either, so the form asks for
 * the one venue it is offering to.
 */
export const POD_FORM_VENUE_OFFER_TERMS = gql`
  query PodFormVenueOfferTerms($venue_id: ID!) {
    publicVenue(venue_id: $venue_id) {
      id
      capacity
      offer_min_guests
      offer_min_business {
        model
        amount
      }
    }
  }
`;

export interface VenueOfferTerms {
  /**
   * The fewest guests an offer may be for: the venue's minimum, never more than
   * its space holds (the server's `openingMinGuests`). 0 while unknown.
   */
  minGuests: number;
  /** What the whole venue holds; null while unknown or unset. */
  capacity: number | null;
  /** What the venue hopes each booking brings, one amount per basis; empty while unknown or unset. */
  minBusiness: VenueMinBusinessRow[];
}

interface TermsAnswer {
  publicVenue: {
    id: string;
    capacity?: number | null;
    offer_min_guests?: number | null;
    offer_min_business?: VenueMinBusinessRow[] | null;
  } | null;
}

/** The bounds of an offer to `venueId` ('' asks nothing — no offer is being made). */
export function useVenueOfferTerms(venueId: string): VenueOfferTerms {
  const { data } = useQuery<TermsAnswer>(POD_FORM_VENUE_OFFER_TERMS, {
    variables: { venue_id: venueId },
    skip: !venueId,
    fetchPolicy: 'cache-first',
  });
  // Skipped is no offer at all, whatever an earlier answer left behind.
  const venue = venueId ? data?.publicVenue : null;
  const capacity = Math.max(0, Math.floor(Number(venue?.capacity) || 0));
  return {
    minGuests: offerGuestFloor(venue?.offer_min_guests, capacity),
    capacity: capacity > 0 ? capacity : null,
    minBusiness: venue?.offer_min_business ?? [],
  };
}
