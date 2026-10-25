export const venueOfferTypeDefs = /* GraphQL */ `
  "How the host offers to pay the venue."
  enum VenueOfferModel {
    "rate x guests (a minimum order value per person)"
    PER_GUEST
    "rate x hours booked"
    PER_HOUR
    "rate for the picked window"
    PER_SLOT
    "one price"
    FLAT
  }

  "SENT: the host's terms, the venue answers. COUNTERED: the venue's terms, the host answers. ACCEPTED / DECLINED: closed."
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
    "Guests; on Create Pod this is always the pod's spots (the most guests)."
    pax: Int
    pets: Boolean
    model: VenueOfferModel!
    "Rupees per guest, per hour, for the slot, or the flat price."
    rate: Float!
    "What the venue should provide for this money, one point each (Create Pod requires at least one)."
    offerings: [String!]
    "Anything else asked of the venue. Optional."
    note: String
  }

  "Price terms one side puts forward. A counter may also change the fewest guests and the points (left out: unchanged)."
  input VenueOfferTermsInput {
    model: VenueOfferModel!
    rate: Float!
    "The fewest guests the venue is paid for (1 up to the booking's guests)."
    min_guests: Int
    "What the venue provides for this money, one point each."
    offerings: [String!]
  }

  type VenueOfferCounter {
    model: VenueOfferModel!
    rate: Float!
    "The fewest guests the venue is paid for on these terms."
    min_guests: Int!
    offerings: [String!]!
    "Priced for the most guests."
    quote: VenuePriceBreakdown!
    "Priced for the fewest guests."
    quote_min: VenuePriceBreakdown!
    note: String!
    at: String
  }

  type VenueOfferHistoryEntry {
    by: VenueOfferParty!
    action: VenueOfferAction!
    model: VenueOfferModel
    rate: Float
    total: Float
    min_guests: Int
    note: String!
    at: String
  }

  "A venue booking negotiated by offer, as the venue's inbox, the chat and the host's pod show it."
  type VenueBookingOffer {
    slot_id: ID!
    venue_id: ID!
    pod_id: ID
    start_at: String!
    end_at: String!
    space_label: String!
    "The host's terms (their offer, or their latest counter)."
    model: VenueOfferModel!
    rate: Float!
    "The most guests: the pod's spots."
    pax: Int!
    "The fewest guests the venue is paid for on the host's terms."
    min_guests: Int!
    "What the host asks the venue to provide."
    offerings: [String!]!
    "The host's note to the venue."
    note: String!
    pets: Boolean!
    "The host's terms, priced for the most guests with the venue's charges and Duncit's commission on top."
    quote: VenuePriceBreakdown!
    "The host's terms priced for the fewest guests."
    quote_min: VenuePriceBreakdown!
    status: VenueOfferStatus!
    "1 for the host's offer, +1 per counter from either side."
    round: Int!
    "The venue's counter, while it is the terms on the table."
    counter: VenueOfferCounter
    history: [VenueOfferHistoryEntry!]!
    "Whose move it is; null once closed."
    awaiting: VenueOfferParty
    "When the side whose move it is must answer by (ISO); null once closed or on offers made before expiry."
    expires_at: String
  }

  "A live price for an offer or a counter, at the most and the fewest guests. ok = false: why it cannot be sent (message)."
  type VenueOfferQuoteResult {
    ok: Boolean!
    message: String
    quote: VenuePriceBreakdown
    quote_min: VenuePriceBreakdown
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
    "The fewest guests the venue is paid for (0 when the booking has no minimum)."
    min_guests: Int!
    "The most guests (the pod's spots; 0 when unknown)."
    max_guests: Int!
    "What the venue was asked to provide."
    offerings: [String!]!
    "The note on the terms."
    note: String!
    "1 for the host's offer, +1 per counter (0 for a booking made before offers)."
    round: Int!
    "Whose move it is while pending."
    awaiting: VenueOfferParty
    "When the pending answer is due (ISO)."
    expires_at: String
    "Exactly what the venue is paid (at the most guests)."
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
    "Pod host: a counter-back to the venue's counter, priced before it is sent."
    hostCounterQuote(pod_id: ID!, terms: VenueOfferTermsInput!): VenueOfferQuoteResult!
    "Open hours, closed days and busy windows between two dates (YYYY-MM-DD, at most 62 days)."
    venueOfferCalendar(venue_id: ID!, from: String!, to: String!, space_label: String): VenueBookingCalendar!
    "A pod's venue offer, for its hosts and the venue's owner. Null when the pod has none."
    podVenueOffer(pod_id: ID!): VenueBookingOffer
  }

  extend type Mutation {
    "Venue owner answers a host's offer with its own terms (accept / reject: approveVenueSlotRequest / declineVenueSlotRequest). round: the round read."
    counterVenueOffer(slot_id: ID!, terms: VenueOfferTermsInput!, note: String, round: Int): VenueBookingOffer!
    "Host accepts the venue's counter: the booking is confirmed and the pod goes live."
    acceptVenueCounterOffer(pod_id: ID!, round: Int): VenueBookingOffer!
    "Host declines the venue's counter: the hold is released and the pod is venue-declined."
    rejectVenueCounterOffer(pod_id: ID!, reason: String, round: Int): Boolean!
    "Host answers the venue's counter with terms of their own; the venue answers next."
    counterVenueOfferAsHost(pod_id: ID!, terms: VenueOfferTermsInput!, note: String, round: Int): VenueBookingOffer!
  }
`;
