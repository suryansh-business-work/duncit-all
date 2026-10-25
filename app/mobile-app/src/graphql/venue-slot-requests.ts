import { gql } from '@/generated/graphql';

/**
 * Booking requests, for a venue owner on their phone — hosts who want to run
 * a pod at the venue, each with the terms they offer. The same operations the
 * Partners console and mWeb use (`@duncit/availability-calendar` offers),
 * re-declared here because the app's codegen only reads this workspace. The
 * offer's terms are the venue chat's selection (`MobileVenueOfferTerms`), so
 * one card and one answer sheet read both.
 */
export const VenueSlotRequestsDocument = gql(`
  query MobileVenueSlotRequests($venue_id: ID) {
    myVenues {
      id
      venue_name
    }
    venueSlotRequests(venue_id: $venue_id) {
      slot_id
      venue_id
      venue_name
      start_at
      end_at
      whole_day
      price
      pricing_mode
      overtime_rate
      requested_at
      pod_id
      pod_title
      pod_description
      host_name
      host_email
      host_phone
      pod_is_free
      offer {
        ...MobileVenueOfferTerms
        history {
          by
          action
          model
          rate
          min_guests
          note
          at
        }
      }
    }
  }
`);

/** Every answer carries the round it read; the server refuses it (OFFER_CHANGED) when the host moved first. */
export const ApproveVenueSlotRequestDocument = gql(`
  mutation MobileApproveVenueSlotRequest($slot_id: ID!, $round: Int) {
    approveVenueSlotRequest(slot_id: $slot_id, round: $round) {
      id
      status
    }
  }
`);

export const DeclineVenueSlotRequestDocument = gql(`
  mutation MobileDeclineVenueSlotRequest($slot_id: ID!, $reason: String, $round: Int) {
    declineVenueSlotRequest(slot_id: $slot_id, reason: $reason, round: $round) {
      id
      status
    }
  }
`);

/** The venue's own terms for a host's offer; the host then accepts, rejects or counters them. */
export const CounterVenueOfferDocument = gql(`
  mutation MobileCounterVenueOffer(
    $slot_id: ID!
    $terms: VenueOfferTermsInput!
    $note: String
    $round: Int
  ) {
    counterVenueOffer(slot_id: $slot_id, terms: $terms, note: $note, round: $round) {
      slot_id
      status
      round
    }
  }
`);

/** A counter priced for the booking's own window, at the most and the fewest guests, before it is sent. */
export const VenueCounterQuoteDocument = gql(`
  query MobileVenueCounterQuote($slot_id: ID!, $terms: VenueOfferTermsInput!) {
    venueCounterQuote(slot_id: $slot_id, terms: $terms) {
      ...MobileCounterQuoteResult
    }
  }
`);
