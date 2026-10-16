import gql from 'graphql-tag';

export const podSeriesTypeDefs = gql`
  "How often a recurring pod repeats."
  enum PodSeriesFrequency {
    DAILY
    WEEKLY
    BIWEEKLY
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
    "The slot of the FIRST date. Every later date needs an identical slot (same space and times)."
    venue_slot_id: ID
    "Virtual pods: the first date's start and end."
    pod_date_time: String
    pod_end_date_time: String
    frequency: PodSeriesFrequency!
    "The last moment of the chosen end day (ISO), worked out in the admin-set time zone."
    ends_on: String!
    "Dates (ISO starts) the host unticked in the preview."
    skip_dates: [String!]
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
    reason: PodSeriesSkipReason
  }

  type PodSeriesPreview {
    frequency: PodSeriesFrequency!
    "Admin limits the plan was checked against."
    max_occurrences: Int!
    max_span_days: Int!
    dates: [PodSeriesDate!]!
  }

  type PodSeriesSkippedDate {
    date: String!
    reason: PodSeriesSkipReason!
    detail: String
  }

  type PodSeriesPublishResult {
    series_id: ID!
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
  }

  extend type Mutation {
    "Publishes a draft as a recurring pod: one pod per date that can run."
    publishPodDraftSeries(
      draft_id: ID!
      input: CreatePodInput!
      plan: PodSeriesPlanInput!
    ): PodSeriesPublishResult!
    "Venue owner: accept or decline every still-pending date of a series at once."
    venueDecidePodSeries(series_id: ID!, approve: Boolean!, reason: String): PodSeriesDecisionResult!
    "Host: cancel every date of the series that has not started yet. Returns how many."
    hostCancelPodSeries(series_id: ID!, reason_subject: String!, reason_note: String): Int!
  }
`;
