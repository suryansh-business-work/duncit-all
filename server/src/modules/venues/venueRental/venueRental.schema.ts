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
    "Whether Duncit refunds the deposit (less any damage) to the guest through Razorpay once the item comes back. Off: the venue keeps it."
    deposit_refundable: Boolean!
    "Renting for a pod closes this many hours before it starts."
    booking_cutoff_hours: Int!
    "An unmarked rental is closed as returned this many days after the pod ends, and its deposit refunded to the guest through Razorpay."
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
    "The venue's own rental terms (rich-text HTML), shown with Duncit's. Sanitise before rendering."
    venue_terms_html: String!
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
    "What the booking was owed back when it closed. Fixed once closed: read refund_outstanding for what is still owed."
    refund_due: Float!
    "NONE, DUE, PAID (Razorpay confirmed, or a pre-2026-11-22 hand mark: see refund_state), or IN_PAYMENT (returned with the payment's cancellation refund)."
    refund_status: String!
    "The Razorpay refund id once Razorpay confirms the refund (older rows: whatever was typed)."
    refund_ref: String!
    refunded_at: String
    "Cash the venue handed back at the venue: bookings closed before 2026-11-22 only, 0 since Duncit refunds deposits."
    deposit_at_venue: Float!
    commission_pct: Float!
    commission_amount: Float!
    "What Duncit pays the venue for this booking: rent less commission, plus any deposit it kept (damage, or non-refundable)."
    venue_amount: Float!
    "The VENUE_RENTAL payout that carried venue_amount, once raised."
    release_id: String
    marked_at: String
    "Closed by the deposit auto-release, not a person."
    auto_released: Boolean!
    created_at: String!
    "NOT_ELIGIBLE, AWAITING_RETURN, ELIGIBLE, PROCESSING, REFUNDED, FAILED, REQUIRES_REVIEW or IN_PAYMENT."
    refund_state: String
    "What the booking is owed back (0 while the item is out or nothing is owed)."
    refund_eligible: Float
    "Queued or in flight on Razorpay, not yet confirmed."
    refund_pending: Float
    "Confirmed processed by Razorpay."
    refunded_amount: Float
    "Owed and not yet confirmed by Razorpay."
    refund_outstanding: Float
    "Why the refund waits for Finance (REQUIRES_REVIEW only)."
    refund_review_reason: String
    "The Razorpay refund record's own status: QUEUED, SENDING, PROCESSING, SUCCEEDED, FAILED, RECONCILIATION_REQUIRED or NOT_APPLICABLE."
    refund_gateway_status: String
    "DUNCIT_REFUND (Duncit refunds the deposit through Razorpay) or VENUE_CASH (older bookings: handed back at the venue)."
    deposit_policy: String
  }

  "The guest on a rental. Email is Finance's only."
  type RentalPerson {
    id: ID
    name: String!
    phone: String
    email: String
  }

  "Where the item is returned: the venue and its contact. Email is Finance's only."
  type RentalVenueContact {
    id: ID!
    name: String!
    contact_name: String!
    phone: String
    email: String
    address: String!
  }

  "The pod a rental was booked for. The pod page is /club/<club_public_id>/pod/<public_id>."
  type RentalPodInfo {
    id: ID!
    public_id: String!
    club_public_id: String!
    title: String!
    starts_at: String
    ends_at: String
  }

  "The payment a rental rode on (Finance only)."
  type RentalPaymentInfo {
    payment_doc_id: ID!
    payment_ref: String!
    gateway: String!
    "The captured Razorpay payment id the refund is sent against."
    razorpay_payment_id: String
    total: Float!
    status: String!
    paid_at: String
  }

  "One Razorpay refund carrying the rental's money: its own, or the pod cancellation's."
  type RentalRefundAttempt {
    id: ID!
    "RENTAL or POD_CANCELLATION."
    source: String!
    status: String!
    amount: Float!
    "Finance only."
    razorpay_refund_id: String
    attempts: Int!
    "Finance only."
    last_error: String!
    requested_at: String
    processed_at: String
    created_at: String!
  }

  "Optional evidence on a rental. Never the proof of a gateway refund: that is Razorpay's record."
  type RentalProof {
    note: String!
    image_urls: [String!]!
    added_by_name: String!
    "FINANCE or VENUE."
    added_by_role: String!
    added_at: String!
  }

  "One step of a rental's life."
  type RentalEvent {
    type: String!
    at: String!
    actor_name: String!
    "SYSTEM, FINANCE, VENUE, GUEST or RAZORPAY."
    actor_role: String!
    amount: Float
    detail: String!
  }

  "One rental, whole: as Finance sees it, or as its venue does."
  type RentalBookingDetail {
    booking: RentalBooking!
    "FINANCE or VENUE: which view this is."
    viewer: String!
    guest: RentalPerson!
    venue: RentalVenueContact!
    pod: RentalPodInfo
    "Finance only; null for the venue."
    payment: RentalPaymentInfo
    refunds: [RentalRefundAttempt!]!
    proofs: [RentalProof!]!
    events: [RentalEvent!]!
  }

  "Optional evidence: a note, photos uploaded through Duncit, or both."
  input RentalProofInput {
    note: String
    image_urls: [String!]
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

  "Whether a venue's refundable rental deposits are taxed with the rent."
  type VenueRentalDepositGst {
    venue_id: ID!
    rental_deposit_gst: Boolean!
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
    "Finance (everything), or the rental's venue owner / venues console (its own view): one rental with its guest, pod, venue, Razorpay refunds, proofs and timeline."
    rentalBookingDetail(id: ID!): RentalBookingDetail!
  }

  extend type Mutation {
    "Finance: change the rental settings. Fields left out keep their value."
    updateRentalSettings(input: RentalSettingsInput!): RentalSettings!
    "Venue owner or venues console: the item came back, or part of the deposit is kept for damage."
    markRentalBooking(id: ID!, input: MarkRentalBookingInput!): RentalBooking!
    "Retired: rental refunds go out through Razorpay and read paid only when Razorpay confirms them. Always refuses."
    markRentalRefunded(id: ID!, reference: String!): RentalBooking!
      @deprecated(reason: "Rental refunds are sent through Razorpay automatically. Read rentalBookingDetail for the refund, or use sendRentalRefund for one waiting for review.")
    "Finance managers: send a rental refund that is waiting for review through Razorpay (never marks anything paid). note: why, at least 10 characters."
    sendRentalRefund(id: ID!, note: String!): RentalBookingDetail!
    "Finance, or the rental's venue owner / venues console: attach optional evidence (a note and/or up to 6 photos uploaded through Duncit)."
    addRentalBookingProof(id: ID!, input: RentalProofInput!): RentalBookingDetail!
    "Venues console: whether this venue's refundable deposits carry GST with the rent (default on)."
    setVenueRentalDepositGst(venue_id: ID!, charge_gst: Boolean!): VenueRentalDepositGst!
  }
`;
