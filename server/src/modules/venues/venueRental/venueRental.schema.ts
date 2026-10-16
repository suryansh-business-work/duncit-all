import gql from 'graphql-tag';

export const venueRentalTypeDefs = gql`
  "Finance > Rented Items > Settings — the rules every venue rental runs under."
  type RentalSettings {
    "Off hides Pod Rent everywhere and refuses new rentals."
    enabled: Boolean!
    "Terms & Conditions every renter agrees to, as rich-text HTML."
    terms_html: String!
    "Duncit's commission on rent (never on the deposit), percent."
    commission_pct: Float!
    "Whether a guest who backs out of the pod in time gets the rent back. A cancelled pod always refunds it."
    rent_refundable_on_backout: Boolean!
    "Whether a deposit comes back once the venue marks the item returned."
    deposit_refundable: Boolean!
    "Renting for a pod closes this many hours before it starts."
    booking_cutoff_hours: Int!
    "An unmarked deposit is refunded automatically this many days after the pod ends."
    deposit_auto_release_days: Int!
    updated_at: String
  }

  "What a guest needs before renting: the terms and the rules that apply to them."
  type PublicRentalSettings {
    enabled: Boolean!
    terms_html: String!
    rent_refundable_on_backout: Boolean!
    deposit_refundable: Boolean!
    booking_cutoff_hours: Int!
  }

  "One item a pod's venue rents out, with what is left of it for that pod."
  type PodRentalItem {
    id: ID!
    name: String!
    description: String!
    images: [String!]!
    "SLOT: the rate covers the whole pod. HOUR: the rate is per hour of the pod."
    unit: VenueRentalUnit!
    rate: Int!
    "Refundable deposit per unit."
    deposit: Int!
    "Units still free for this pod."
    available: Int!
    "The most each guest on a booking may rent."
    per_guest_limit: Int!
  }

  "What a guest can rent for one pod."
  type PodRentalCatalogue {
    "Whether renting is open for this pod right now."
    open: Boolean!
    "DISABLED, NO_VENUE or CUTOFF while closed; null while open."
    closed_reason: String
    "Hours an HOUR item is charged for on this pod."
    hours: Int!
    currency_symbol: String!
    items: [PodRentalItem!]!
  }

  "An upcoming pod a guest can still rent items for (Pod Rent on /shop)."
  type RentablePod {
    id: ID!
    "The pod's public id, for its link."
    pod_id: String!
    "The club's public id, for the pod's link."
    club_id: String!
    pod_title: String!
    pod_date_time: String
    cover_url: String!
    venue_name: String!
    "Items the venue rents out."
    item_count: Int!
    "The lowest rate among them."
    from_rate: Int!
    currency_symbol: String!
  }

  "One rented item on one pod booking: what was paid, and how it closed."
  type RentalBooking {
    id: ID!
    currency_symbol: String!
    payment_ref: String!
    pod_id: ID!
    pod_title: String!
    guest_name: String!
    venue_id: ID!
    item_id: ID!
    name: String!
    image_url: String!
    unit: VenueRentalUnit!
    rate: Int!
    "1 for a SLOT item, the pod's hours for an HOUR item."
    units: Int!
    quantity: Int!
    rent_amount: Float!
    deposit_amount: Float!
    "BOOKED, UNAVAILABLE (sold out after checkout), CANCELLED, RELEASED (guest left the pod), RETURNED or DAMAGED."
    status: String!
    damage_claim: Float!
    damage_note: String!
    "Money owed back to the guest once the booking closed."
    refund_due: Float!
    "NONE, DUE, PAID, or IN_PAYMENT (returned with the payment's cancellation refund)."
    refund_status: String!
    refund_ref: String!
    refunded_at: String
    commission_pct: Float!
    commission_amount: Float!
    "What the venue earns from this booking: rent less commission, plus any deposit it kept."
    venue_amount: Float!
    "The VENUE_RENTAL payout that carried venue_amount, once raised."
    release_id: String
    marked_at: String
    "Closed by the deposit auto-release, not a person."
    auto_released: Boolean!
    created_at: String!
  }

  "Server-side table page for the shared table engine."
  type RentalBookingTablePage {
    rows: [RentalBooking!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "A venue's rented items, in numbers."
  type RentalVenueStats {
    currency_symbol: String!
    bookings: Int!
    "Items out or due out (not yet marked)."
    open: Int!
    rent_total: Float!
    deposits_held: Float!
    "What the venue has earned from closed bookings."
    earned: Float!
    "The part of earned already raised as a payout."
    paid_out: Float!
  }

  enum RentalMarkOutcome {
    RETURNED
    DAMAGED
  }

  input MarkRentalBookingInput {
    outcome: RentalMarkOutcome!
    "Rupees kept from the deposit, required for DAMAGED, never more than the deposit."
    damage_claim: Float
    "What was damaged (required for DAMAGED)."
    note: String
  }

  input RentalSettingsInput {
    enabled: Boolean
    terms_html: String
    commission_pct: Float
    rent_refundable_on_backout: Boolean
    deposit_refundable: Boolean
    booking_cutoff_hours: Int
    deposit_auto_release_days: Int
  }

  extend type Query {
    "Finance: the rental settings."
    rentalSettings: RentalSettings!
    "Anyone: the rental terms and refund rules."
    publicRentalSettings: PublicRentalSettings!
    "Anyone: what the pod's venue rents out, and how much is left for this pod."
    podRentals(pod_id: ID!): PodRentalCatalogue!
    "Anyone: upcoming pods a guest can still rent items for, soonest first."
    rentablePods(limit: Int): [RentablePod!]!
    "Signed in: the guest's own rented items, newest first."
    myRentalBookings(limit: Int, offset: Int): [RentalBooking!]!
    "Finance: every rental booking."
    rentalBookingsTable(query: TableQueryInput): RentalBookingTablePage!
    "Venue owner or venues console: the venue's rental bookings."
    venueRentalBookingsTable(venue_id: ID!, query: TableQueryInput): RentalBookingTablePage!
    "Venue owner or venues console: the venue's rental numbers."
    venueRentalStats(venue_id: ID!): RentalVenueStats!
  }

  extend type Mutation {
    "Finance: change the rental settings. Fields left out keep their value."
    updateRentalSettings(input: RentalSettingsInput!): RentalSettings!
    "Venue owner or venues console: the item came back, or part of the deposit is kept for damage."
    markRentalBooking(id: ID!, input: MarkRentalBookingInput!): RentalBooking!
    "Finance: the rental refund was paid back to the guest."
    markRentalRefunded(id: ID!, reference: String!): RentalBooking!
  }
`;
