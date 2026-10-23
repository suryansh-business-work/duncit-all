export const venueOfferTypeDefs = /* GraphQL */ `
  "How the host offers to pay the venue."
  enum VenueOfferModel {
    "rate x guests"
    PER_GUEST
    "rate x hours booked"
    PER_HOUR
    "rate for the picked window"
    PER_SLOT
    "one price"
    FLAT
  }

  "SENT: the venue answers. COUNTERED: the host answers. ACCEPTED / DECLINED: closed."
  enum VenueOfferStatus {
    SENT
    COUNTERED
    ACCEPTED
    DECLINED
  }

  enum VenueOfferParty {
    HOST
    VENUE
  }

  enum VenueOfferAction {
    OFFER
    COUNTER
    ACCEPT
    REJECT
  }

  "A host's venue booking: the window, the guests and the terms. The server prices it; a client never sends a total."
  input VenueOfferInput {
    start_at: String!
    end_at: String!
    space_label: String
    "Guests; on Create Pod this is always the pod's spots."
    pax: Int
    pets: Boolean
    model: VenueOfferModel!
    "Rupees per guest, per hour, for the slot, or the flat price."
    rate: Float!
  }

  "Price terms one side puts forward."
  input VenueOfferTermsInput {
    model: VenueOfferModel!
    rate: Float!
  }

  type VenueOfferCounter {
    model: VenueOfferModel!
    rate: Float!
    quote: VenuePriceBreakdown!
    note: String!
    at: String
  }

  type VenueOfferHistoryEntry {
    by: VenueOfferParty!
    action: VenueOfferAction!
    model: VenueOfferModel
    rate: Float
    total: Float
    note: String!
    at: String
  }

  "A venue booking negotiated by offer, as the venue's inbox and the host's pod show it."
  type VenueBookingOffer {
    slot_id: ID!
    venue_id: ID!
    pod_id: ID
    start_at: String!
    end_at: String!
    space_label: String!
    "The host's terms."
    model: VenueOfferModel!
    rate: Float!
    pax: Int!
    pets: Boolean!
    "The host's terms, priced with the venue's charges and Duncit's commission on top."
    quote: VenuePriceBreakdown!
    status: VenueOfferStatus!
    "1 for the host's offer, +1 per counter."
    round: Int!
    "The venue's counter, while there is one."
    counter: VenueOfferCounter
    history: [VenueOfferHistoryEntry!]!
    "Whose move it is; null once closed."
    awaiting: VenueOfferParty
  }

  "Create Pod's live price for an offer. ok = false: why it cannot be sent (message)."
  type VenueOfferQuoteResult {
    ok: Boolean!
    message: String
    quote: VenuePriceBreakdown
  }

  extend type VenueSlotRequest {
    "Set when the request is a host's offer: Accept, Reject or Counter it."
    offer: VenueBookingOffer
  }

  extend type VenueSlotDecision {
    "Set when the request is a host's offer."
    offer: VenueBookingOffer
  }

  "A venue booking's money terms for Duncit staff: agreed once booked, on the table while pending."
  type VenueBookingTermsRow {
    slot_id: ID!
    pod_id: ID
    pod_title: String!
    start_at: String!
    end_at: String!
    "PENDING (waiting on an answer) or BOOKED."
    status: String!
    "The offer's state; null for a booking made before offers."
    offer_status: VenueOfferStatus
    "How the amount is read (VenueOfferModel, or the older booking's VenuePricingModel)."
    model: String!
    rate: Float!
    "Exactly what the venue is paid."
    venue_payout: Float!
    "Duncit's commission, on top of the venue's amount."
    platform_fee: Float!
    "What the host pays for the venue."
    total: Float!
  }

  extend type Query {
    "Venues console: a venue's pending and booked holds with their money terms, newest first (at most 100)."
    adminVenueBookingTerms(venue_id: ID!, limit: Int): [VenueBookingTermsRow!]!
    "Prices an offer at a venue and checks it can be sent (venue open, time free, guests fit)."
    venueOfferQuote(venue_id: ID!, offer: VenueOfferInput!): VenueOfferQuoteResult!
    "Venue owner: a counter to a pending offer, priced for that booking's own window before it is sent."
    venueCounterQuote(slot_id: ID!, terms: VenueOfferTermsInput!): VenueOfferQuoteResult!
    "Open hours, closed days and busy windows between two dates (YYYY-MM-DD, at most 62 days)."
    venueOfferCalendar(venue_id: ID!, from: String!, to: String!, space_label: String): VenueBookingCalendar!
    "A pod's venue offer, for its hosts and the venue's owner. Null when the pod has none."
    podVenueOffer(pod_id: ID!): VenueBookingOffer
  }

  extend type Mutation {
    "Venue owner answers a host's offer with its own terms (accept / reject: approveVenueSlotRequest / declineVenueSlotRequest)."
    counterVenueOffer(slot_id: ID!, terms: VenueOfferTermsInput!, note: String): VenueBookingOffer!
    "Host accepts the venue's counter: the booking is confirmed and the pod goes live."
    acceptVenueCounterOffer(pod_id: ID!): VenueBookingOffer!
    "Host declines the venue's counter: the hold is released and the pod is venue-declined."
    rejectVenueCounterOffer(pod_id: ID!, reason: String): Boolean!
  }
`;
