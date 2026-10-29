import { gql } from '@/generated/graphql';

/**
 * A host's offer to a venue — Create Pod's calendar and live price, and the
 * bargaining over it on the pending screen and in the venue chat. The same
 * operations mWeb sends (`@duncit/utils` VENUE_OFFER_*_SDL, rule 29), written
 * out in full because the mobile codegen reads these templates statically.
 */

/** Which days and hours the venue is open and free (at most 62 days a call). */
export const VenueOfferCalendarDocument = gql(`
  query MobileVenueOfferCalendar(
    $venue_id: ID!
    $from: String!
    $to: String!
    $space_label: String
  ) {
    venueOfferCalendar(venue_id: $venue_id, from: $from, to: $to, space_label: $space_label) {
      buffer_minutes
      min_notice_minutes
      days {
        date
        closed_reason
        open
        close
        busy {
          start
          end
        }
        slots {
          start
          end
          price
          available
        }
      }
    }
  }
`);

/**
 * The server's price of one side's terms, line by line — every offer surface
 * reads this one selection (the price card, the counter preview, the inbox), so
 * every quote shares one type.
 */
export const VenueQuoteFieldsFragment = gql(`
  fragment MobileVenueQuoteFields on VenuePriceBreakdown {
    model
    rate
    pax
    hours
    base
    rules {
      type
      label
      amount
    }
    min_spend_top_up
    cleaning_fee
    pet_fee
    gst_pct
    taxes
    platform_fee_pct
    platform_fee
    venue_payout
    total
    deposit
  }
`);

/**
 * A window-and-terms price as every offer surface draws it (VenueQuoteCard):
 * Create Pod, Pod Requests, an Auto Pod's venue accept and a venue taking over
 * a pod — one selection, so the four answers share one type.
 */
export const OfferQuoteResultFragment = gql(`
  fragment MobileOfferQuoteResult on VenueOfferQuoteResult {
    ok
    message
    quote {
      ...MobileVenueQuoteFields
    }
  }
`);

/**
 * The server's price for the host's offer at the pod's spots (`quote`) and at
 * the venue's minimum guests (`quote_min`) — or why it cannot be sent.
 */
export const VenueOfferQuoteDocument = gql(`
  query MobileVenueOfferQuote($venue_id: ID!, $offer: VenueOfferInput!) {
    venueOfferQuote(venue_id: $venue_id, offer: $offer) {
      ...MobileOfferQuoteResult
      quote_min {
        ...MobileVenueQuoteFields
      }
    }
  }
`);

/** A counter priced before it is sent, at the most and the fewest guests — either side's. */
export const CounterQuoteResultFragment = gql(`
  fragment MobileCounterQuoteResult on VenueOfferQuoteResult {
    ok
    message
    quote {
      ...MobileVenueQuoteFields
    }
    quote_min {
      ...MobileVenueQuoteFields
    }
  }
`);

/**
 * A booking offer's terms as both sides read them (`POD_VENUE_OFFER_SDL`): the
 * host's terms with what they ask beside the price, the server's quote at both
 * ends of the guests, the round, whose move it is and until when, the
 * venue's counter while there is one, any photos either side attached, how
 * many counters each side has used of its share, and whether it is a free
 * arrangement (a free pod, or a FREE venue with the host's reason) — accepted
 * or declined, never countered.
 */
export const VenueOfferTermsFragment = gql(`
  fragment MobileVenueOfferTerms on VenueBookingOffer {
    slot_id
    venue_id
    pod_id
    start_at
    end_at
    space_label
    model
    rate
    pax
    min_guests
    offerings
    note
    images
    pets
    status
    round
    awaiting
    expires_at
    counters_per_side
    host_counters_used
    venue_counters_used
    free_pod
    free_justification {
      reason
      details
      accepted_at
    }
    quote {
      ...MobileVenueQuoteFields
    }
    quote_min {
      ...MobileVenueQuoteFields
    }
    counter {
      model
      rate
      min_guests
      offerings
      note
      images
      at
      quote {
        ...MobileVenueQuoteFields
      }
      quote_min {
        ...MobileVenueQuoteFields
      }
    }
  }
`);

/** A pod's live offer to its venue — the host's pending screen and the venue chat. */
export const PodVenueOfferDocument = gql(`
  query MobilePodVenueOffer($pod_id: ID!) {
    podVenueOffer(pod_id: $pod_id) {
      ...MobileVenueOfferTerms
    }
  }
`);

/** The host takes the venue's counter for the round they read: the booking is confirmed. */
export const AcceptVenueCounterOfferDocument = gql(`
  mutation MobileAcceptVenueCounterOffer($pod_id: ID!, $round: Int) {
    acceptVenueCounterOffer(pod_id: $pod_id, round: $round) {
      slot_id
      status
    }
  }
`);

/** The host turns the venue's counter down for the round they read: the hold is released. */
export const RejectVenueCounterOfferDocument = gql(`
  mutation MobileRejectVenueCounterOffer($pod_id: ID!, $reason: String, $round: Int) {
    rejectVenueCounterOffer(pod_id: $pod_id, reason: $reason, round: $round)
  }
`);

/** The host answers the venue's counter with terms of their own; the venue answers next. */
export const CounterVenueOfferAsHostDocument = gql(`
  mutation MobileCounterVenueOfferAsHost(
    $pod_id: ID!
    $terms: VenueOfferTermsInput!
    $note: String
    $round: Int
  ) {
    counterVenueOfferAsHost(pod_id: $pod_id, terms: $terms, note: $note, round: $round) {
      slot_id
      status
      round
    }
  }
`);

/** The host's counter-back priced for the pod's own window before it is sent. */
export const HostCounterQuoteDocument = gql(`
  query MobileHostCounterQuote($pod_id: ID!, $terms: VenueOfferTermsInput!) {
    hostCounterQuote(pod_id: $pod_id, terms: $terms) {
      ...MobileCounterQuoteResult
    }
  }
`);

/** Either side's edit of its own latest counter, priced before it is saved. */
export const EditCounterQuoteDocument = gql(`
  query MobileEditCounterQuote($pod_id: ID!, $terms: VenueOfferTermsInput!) {
    editCounterQuote(pod_id: $pod_id, terms: $terms) {
      ...MobileCounterQuoteResult
    }
  }
`);

/**
 * Either side changes its own latest counter for the round it read, before the
 * other side has seen it (else OFFER_SEEN); the round moves on.
 */
export const EditVenueOfferCounterDocument = gql(`
  mutation MobileEditVenueOfferCounter(
    $pod_id: ID!
    $terms: VenueOfferTermsInput!
    $note: String
    $round: Int!
  ) {
    editVenueOfferCounter(pod_id: $pod_id, terms: $terms, note: $note, round: $round) {
      slot_id
      status
      round
    }
  }
`);

/** Either side takes back its own latest counter before the other side has seen it: the terms before it stand again. */
export const WithdrawVenueOfferCounterDocument = gql(`
  mutation MobileWithdrawVenueOfferCounter($pod_id: ID!, $round: Int!) {
    withdrawVenueOfferCounter(pod_id: $pod_id, round: $round) {
      slot_id
      status
      round
    }
  }
`);
