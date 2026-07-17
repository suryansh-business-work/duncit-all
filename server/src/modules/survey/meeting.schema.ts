import gql from 'graphql-tag';

export const meetingTypeDefs = gql`
  enum MeetingStatus {
    REQUESTED
    SCHEDULED
    DONE
    CANCELLED
  }

  "Onboarding staff's decision on a DONE meeting."
  enum MeetingDecision {
    APPROVED
    DENIED
  }

  type OnboardingMeeting {
    id: ID!
    "Human-readable request id, e.g. DUN-VEN-000001."
    request_no: String
    kind: SurveyKind!
    user_id: ID!
    user_name: String
    user_email: String
    "Taxonomy the applicant chose in the gate."
    super_category_name: String
    category_name: String
    sub_category_name: String
    "Times the user has rescheduled (reschedule is one-time)."
    reschedule_count: Int
    requested_at: String!
    scheduled_at: String
    meeting_link: String
    status: MeetingStatus!
    "Why onboarding staff cancelled it (null for self-cancels)."
    cancel_reason: String
    "Hidden from the onboarding calendar (cancelled meeting removed by staff)."
    dismissed: Boolean
    notes: String
    contact_name: String
    contact_phone: String
    "Onboarding decision on the interviewer's feedback: NONE (not yet decided) | APPROVED | DENIED."
    approval_status: String
    "The interviewer's post-meeting feedback (set when the meeting is approved / denied)."
    feedback: String
    created_at: String
    updated_at: String
  }

  input RequestMeetingInput {
    requested_at: String!
    notes: String
    contact_name: String
    contact_phone: String
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
  }
  input UpdateMeetingInput {
    status: MeetingStatus
    scheduled_at: String
    meeting_link: String
    notes: String
  }
  input MeetingFilter {
    kind: SurveyKind
    status: MeetingStatus
    from: String
    to: String
  }

  "Global onboarding-meeting availability (edited from the Onboarding portal)."
  type MeetingAvailability {
    id: ID!
    "Working days, JS getDay() numbering: 0=Sun … 6=Sat."
    week_days: [Int!]!
    start_time: String!
    end_time: String!
    slot_minutes: Int!
    horizon_days: Int!
    timezone_offset_minutes: Int!
  }

  input MeetingAvailabilityInput {
    week_days: [Int!]
    start_time: String
    end_time: String
    slot_minutes: Int
    horizon_days: Int
    timezone_offset_minutes: Int
  }

  "A bookable onboarding-meeting slot; unavailable when another user holds it."
  type MeetingSlot {
    start_at: String!
    end_at: String!
    available: Boolean!
  }

  enum HolidayType {
    PUBLIC_HOLIDAY
    OFFICE_HOLIDAY
    OFFICIAL_LEAVE
  }

  "An onboarding-team holiday / leave day — blocks bookable slots and shows on the calendar."
  type MeetingHoliday {
    id: ID!
    "Wall-clock (IST) calendar day as 'YYYY-MM-DD'."
    date: String!
    name: String
    type: HolidayType!
  }

  input AddMeetingHolidayInput {
    date: String!
    name: String
    type: HolidayType
  }

  "Server-side table page for the shared table engine (onboardingMeetingsTable)."
  type OnboardingMeetingTablePage {
    rows: [OnboardingMeeting!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Current user's meeting request for a kind."
    myMeeting(kind: SurveyKind!): OnboardingMeeting
    "All of the current user's onboarding meetings (one per kind)."
    myMeetings: [OnboardingMeeting!]!
    "Onboarding list of meetings (calendar + tables)."
    onboardingMeetings(filter: MeetingFilter): [OnboardingMeeting!]!
    "Server-side table page (search/filter/sort/paginate) over onboarding meetings."
    onboardingMeetingsTable(query: TableQueryInput): OnboardingMeetingTablePage!
    "Global slot-availability config."
    meetingAvailability: MeetingAvailability!
    "Bookable slots (others' bookings disabled). Pass kind so the user's own other-flow bookings show unavailable; staff pass exclude_meeting_id to keep the meeting being scheduled selectable."
    meetingSlots(kind: SurveyKind, exclude_meeting_id: ID): [MeetingSlot!]!
    "Onboarding-team holidays / leave days (block slots; shown on the calendar)."
    meetingHolidays: [MeetingHoliday!]!
  }

  extend type Mutation {
    requestMeeting(kind: SurveyKind!, input: RequestMeetingInput!): OnboardingMeeting!
    "Move the caller's own meeting to a new open slot (one-time; keeps contact details, resets staff scheduling)."
    rescheduleMyMeeting(kind: SurveyKind!, requested_at: String!, reason: String): OnboardingMeeting!
    "Cancel the caller's own pending meeting (with a reason)."
    cancelMyMeeting(kind: SurveyKind!, reason: String): OnboardingMeeting!
    updateMeeting(id: ID!, input: UpdateMeetingInput!): OnboardingMeeting!
    "Onboarding staff cancel a meeting with a reason — the applicant is emailed and asked to fill the survey again."
    cancelMeeting(id: ID!, reason: String!): OnboardingMeeting!
    "Onboarding staff remove a cancelled meeting from the calendar (kept for audit)."
    dismissMeeting(id: ID!): OnboardingMeeting!
    "Onboarding staff approve or deny a DONE meeting themselves — approval drafts the onboarded host/venue/seller (or grants the club-admin role). No admin round-trip."
    decideMeeting(id: ID!, decision: MeetingDecision!, feedback: String!): OnboardingMeeting!
    updateMeetingAvailability(input: MeetingAvailabilityInput!): MeetingAvailability!
    "Onboarding staff add (or update) a holiday / leave day."
    addMeetingHoliday(input: AddMeetingHolidayInput!): MeetingHoliday!
    "Onboarding staff remove a holiday / leave day."
    removeMeetingHoliday(id: ID!): Boolean!
  }
`;
