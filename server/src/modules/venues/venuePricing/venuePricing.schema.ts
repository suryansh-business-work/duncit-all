export const venuePricingTypeDefs = /* GraphQL */ `
  enum VenuePricingModel {
    PER_PAX
    PER_SLOT
    PER_HOUR
    FLAT
  }

  enum PriceRuleType {
    WEEKDAY_SURCHARGE
    DATE_OVERRIDE
    DATE_RANGE
  }

  enum PriceRuleMode {
    PERCENT
    FLAT
  }

  enum VenueClosedReason {
    PAST
    TOO_FAR
    HOLIDAY
    BLOCKED
    WEEKLY_OFF
    CLOSED
  }

  "A PER_SLOT venue's bookable window, repeated on days_of_week (0 = Sunday)."
  type PricingSlot {
    start_time: String!
    end_time: String!
    price: Float!
    days_of_week: [Int!]!
  }

  "Opening hours of one weekday (0 = Sunday)."
  type DayHours {
    day: Int!
    open: String!
    close: String!
  }

  type PriceRule {
    type: PriceRuleType!
    label: String
    days: [Int!]
    dates: [String!]
    from: String
    to: String
    mode: PriceRuleMode!
    value: Float!
  }

  "A venue's own pricing (Venue Pricing Module). configured = false: not bookable yet."
  type VenuePricing {
    model: VenuePricingModel
    configured: Boolean!
    base_rate: Float!
    min_pax: Int!
    max_pax: Int!
    min_hours: Float!
    max_hours: Float!
    booking_increment_minutes: Int!
    min_spend: Float!
    slots: [PricingSlot!]!
    operating_hours: [DayHours!]!
    price_rules: [PriceRule!]!
    deposit: Float!
    cleaning_fee: Float!
    pet_fee: Float!
    gst_enabled: Boolean!
    blocked_dates: [String!]!
  }

  input PricingSlotInput {
    start_time: String!
    end_time: String!
    price: Float!
    days_of_week: [Int!]!
  }

  input DayHoursInput {
    day: Int!
    open: String!
    close: String!
  }

  input PriceRuleInput {
    type: PriceRuleType!
    label: String
    days: [Int!]
    dates: [String!]
    from: String
    to: String
    mode: PriceRuleMode!
    value: Float!
  }

  input VenuePricingInput {
    model: VenuePricingModel
    base_rate: Float
    min_pax: Int
    max_pax: Int
    min_hours: Float
    max_hours: Float
    booking_increment_minutes: Int
    min_spend: Float
    slots: [PricingSlotInput!]
    operating_hours: [DayHoursInput!]
    price_rules: [PriceRuleInput!]
    deposit: Float
    cleaning_fee: Float
    pet_fee: Float
    gst_enabled: Boolean
    blocked_dates: [String!]
  }

  type AppliedPriceRule {
    type: PriceRuleType!
    label: String!
    mode: PriceRuleMode!
    value: Float!
    amount: Float!
  }

  "How a booking's price was built. Frozen on the booking when it is confirmed."
  type VenuePriceBreakdown {
    model: VenuePricingModel!
    rate: Float!
    pax: Int!
    hours: Float!
    date: String!
    base: Float!
    rules: [AppliedPriceRule!]!
    rules_total: Float!
    min_spend_top_up: Float!
    cleaning_fee: Float!
    pet_fee: Float!
    venue_price: Float!
    gst_pct: Float!
    taxes: Float!
    "Exactly what the venue is paid."
    venue_payout: Float!
    platform_fee_pct: Float!
    "Duncit's fee, charged on top of the venue price."
    platform_fee: Float!
    total: Float!
    "Refundable, payable at the venue."
    deposit: Float!
    confirmed_at: String
  }

  "The window a host books; the server prices it, never the client."
  input InstantBookingInput {
    start_at: String!
    end_at: String!
    pax: Int
    pets: Boolean
    space_label: String
  }

  type BusyWindow {
    start: String!
    end: String!
  }

  type VenueDaySlot {
    start: String!
    end: String!
    price: Float!
    available: Boolean!
  }

  type VenueBookingDay {
    date: String!
    closed_reason: VenueClosedReason
    open: String
    close: String
    busy: [BusyWindow!]!
    slots: [VenueDaySlot!]!
  }

  type VenueBookingCalendar {
    model: VenuePricingModel
    configured: Boolean!
    booking_increment_minutes: Int!
    min_hours: Float!
    max_hours: Float!
    min_pax: Int!
    max_pax: Int!
    "Gap the venue keeps around every booking; pickers must leave it free."
    buffer_minutes: Int!
    "Earliest a booking may start from now."
    min_notice_minutes: Int!
    days: [VenueBookingDay!]!
  }

  "A confirmed instant booking at the owner's venue."
  type VenueBooking {
    slot_id: ID!
    venue_id: ID!
    venue_name: String!
    pod_id: ID!
    pod_title: String!
    start_at: String!
    end_at: String!
    space_label: String!
    "Exactly what the venue is paid for it."
    venue_payout: Float!
    price_snapshot: VenuePriceBreakdown
  }

  "A slot request from before instant booking — kept read-only."
  type VenueSlotRequestHistoryRow {
    slot_id: ID!
    venue_name: String!
    pod_title: String!
    start_at: String!
    end_at: String!
    status: VenueSlotStatus!
    decision: String!
    decided_at: String
    decline_reason: String!
  }

  "An approved venue that cannot be booked yet because its pricing is not set up."
  type VenuePricingSetupGap {
    venue_id: ID!
    venue_no: String
    venue_name: String!
  }

  extend type Query {
    "Venues console: approved venues still waiting for their pricing (not bookable)."
    venuesNeedingPricingSetup: [VenuePricingSetupGap!]!
    "Upcoming confirmed bookings at the caller's venues (one venue when venue_id is given), soonest first."
    myVenueUpcomingBookings(venue_id: ID, limit: Int): [VenueBooking!]!
    "Old slot requests at the caller's venues, read-only history."
    myVenueSlotRequestHistory(venue_id: ID, limit: Int): [VenueSlotRequestHistoryRow!]!
    "A venue's pricing — Create Pod and the Venue Pricing Module both read it."
    venuePricing(venue_id: ID!): VenuePricing!
    "Bookable days and times between two dates (YYYY-MM-DD, at most 62 days)."
    venueBookingCalendar(venue_id: ID!, from: String!, to: String!, space_label: String): VenueBookingCalendar!
    "Prices a window at the venue. draft = the owner's unsaved pricing (preview)."
    venuePriceQuote(venue_id: ID!, booking: InstantBookingInput!, draft: VenuePricingInput): VenuePriceBreakdown!
  }

  extend type Mutation {
    "Owner or admin saves the venue's pricing. Existing bookings keep their frozen price."
    updateVenuePricing(venue_id: ID!, input: VenuePricingInput!): VenuePricing!
  }
`;
