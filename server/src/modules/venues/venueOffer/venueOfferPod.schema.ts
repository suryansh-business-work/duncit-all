/**
 * Where a pod's venue offer stands, on the pod itself — so a host's pod list
 * can say "Venue countered" without asking for each pod's offer
 * (resolver: venueOffer.podField).
 */
export const podVenueOfferTypeDefs = /* GraphQL */ `
  extend type Pod {
    "While the pod waits for its venue: SENT (the venue answers) or COUNTERED (the host answers). Null otherwise."
    venue_offer_status: VenueOfferStatus
  }
`;
