import gql from 'graphql-tag';

export const podSeriesTypeDefs = gql`
  "A recurring pod's visible row, or one of its dates."
  enum PodSeriesRole {
    PARENT
    DATE
  }

  "Percent off a booking of at least min_dates dates of a recurring pod."
  type MultiDateDiscountTier {
    min_dates: Int!
    discount_pct: Int!
  }

  input MultiDateDiscountTierInput {
    min_dates: Int!
    discount_pct: Int!
  }

  "Where one date of a recurring pod stands."
  enum PodSeriesDateStatus {
    UPCOMING
    ONGOING
    COMPLETED
    "Cancelled, or refused by the venue."
    CANCELLED
    "Waiting for the venue to accept the date."
    AWAITING_VENUE
  }

  "One date of a recurring pod, as its details page lists it."
  type PodSeriesDateRow {
    "The date's own pod — what a ticket, backout or host action on that date uses."
    pod_doc_id: ID!
    slug: String!
    start_at: String!
    end_at: String
    status: PodSeriesDateStatus!
    "Spots left on this date (null: unlimited)."
    seats_available: Int
    "Seats the viewer holds on this date (0: not booked)."
    my_seats: Int!
    "This date's ticket price, before any discount."
    pod_amount: Float!
    "Whether the viewer can book this date now."
    bookable: Boolean!
  }

  "Every date of a recurring pod."
  type PodSeriesDates {
    parent_pod_id: ID!
    frequency: PodSeriesFrequency
    multi_date_discount_tiers: [MultiDateDiscountTier!]!
    "Whether the viewer hosts this pod. Members only get the dates the venue accepted."
    is_host: Boolean!
    dates: [PodSeriesDateRow!]!
  }

  type PodSeriesJoinFailure {
    pod_doc_id: ID!
    message: String!
  }

  type PodSeriesJoinResult {
    "Dates joined."
    joined: [ID!]!
    "Dates that could not be joined, and why."
    failed: [PodSeriesJoinFailure!]!
  }

  "How often a recurring pod repeats."
  enum PodSeriesFrequency {
    DAILY
    WEEKLY
    BIWEEKLY
    "The same day of every month (the month's last day when the month is shorter)."
    MONTHLY
    "Only the dates the host picked on the calendar (custom_dates)."
    CUSTOM
  }

  "Why a date of a recurring pod did not become a pod."
  enum PodSeriesSkipReason {
    "The venue opened no matching slot on that date."
    NO_SLOT
    "The venue is on leave that day."
    HOLIDAY
    "The matching slot is already booked or held."
    TAKEN
    "The host took the date out before publishing."
    REMOVED_BY_HOST
    "The date could not be created (in the past, or refused on its own)."
    FAILED
  }

  "The recurring plan a host is about to publish."
  input PodSeriesPlanInput {
    pod_mode: String!
    venue_id: ID
    "The slot of the FIRST date. Later dates book the identical slot (same space and times); a date where the venue has none cannot run."
    venue_slot_id: ID
    "Instant booking of the FIRST date at the venue's own pricing. Every later date is the same window on its day, each booked and priced on its own."
    venue_booking: InstantBookingInput
    "Virtual pods: the first date's start and end."
    pod_date_time: String
    pod_end_date_time: String
    frequency: PodSeriesFrequency!
    "The last moment of the chosen end day (ISO), worked out in the admin-set time zone."
    ends_on: String!
    "CUSTOM only: the ISO start of every date after the first, each at the first date's time of day."
    custom_dates: [String!]
    "Dates (ISO starts) the host unticked in the preview."
    skip_dates: [String!]
    "Percent off a booking of several dates; omitted means the Pod Settings default, [] means none."
    multi_date_discount_tiers: [MultiDateDiscountTierInput!]
  }

  "One date of a recurring plan."
  type PodSeriesDate {
    start_at: String!
    end_at: String
    "Physical pods: the venue slot this date would book."
    slot_id: ID
    "That slot's price — it may differ from date to date."
    price: Int
    available: Boolean!
    "The venue has no slot here yet: the request asks for one, opened when the venue accepts."
    on_request: Boolean!
    reason: PodSeriesSkipReason
  }

  type PodSeriesPreview {
    frequency: PodSeriesFrequency!
    "Admin limits the plan was checked against."
    max_occurrences: Int!
    max_span_days: Int!
    "The largest discount a tier may give (Pod Settings' multi-ticket ceiling)."
    max_discount_pct: Int!
    "The multi-date discount a new recurring pod starts with (Pod Settings)."
    default_multi_date_discount_tiers: [MultiDateDiscountTier!]!
    dates: [PodSeriesDate!]!
  }

  "The Pod Settings every recurring plan is held to."
  type PodSeriesLimits {
    max_occurrences: Int!
    "How far after the first date the last one may fall."
    max_span_days: Int!
    max_discount_pct: Int!
    default_multi_date_discount_tiers: [MultiDateDiscountTier!]!
  }

  type PodSeriesSkippedDate {
    date: String!
    reason: PodSeriesSkipReason!
    detail: String
  }

  type PodSeriesPublishResult {
    series_id: ID!
    "The one pod people see and book from."
    parent_pod_id: ID!
    created_count: Int!
    pods: [Pod!]!
    skipped: [PodSeriesSkippedDate!]!
  }

  type PodSeriesDecisionResult {
    "Dates answered."
    decided: Int!
    "Dates that could no longer be answered (already started, already decided)."
    failed: Int!
  }

  extend type Query {
    "Every date a recurring plan would run on, each with its slot or why it cannot."
    podSeriesPreview(input: PodSeriesPlanInput!): PodSeriesPreview!
    "The limits a recurring plan is held to — so Create Pod can bound the end day before previewing."
    podSeriesLimits: PodSeriesLimits!
    "Every date of the recurring pod that pod_doc_id is (or is a date of); null for a one-time pod."
    podSeriesDates(pod_doc_id: ID!): PodSeriesDates
  }

  extend type Mutation {
    "Publishes a draft as ONE recurring pod whose dates can each run, and be booked, on their own."
    publishPodDraftSeries(
      draft_id: ID!
      input: CreatePodInput!
      plan: PodSeriesPlanInput!
    ): PodSeriesPublishResult!
    "Venue owner: accept or decline every still-pending date of a series at once."
    venueDecidePodSeries(series_id: ID!, approve: Boolean!, reason: String): PodSeriesDecisionResult!
    "Host: cancel every date of the series that has not started yet. Returns how many."
    hostCancelPodSeries(series_id: ID!, reason_subject: String!, reason_note: String): Int!
    "Joins the picked dates of a FREE recurring pod, one free seat each."
    joinFreePodDates(pod_doc_id: ID!, date_pod_ids: [ID!]!): PodSeriesJoinResult!
  }
`;
