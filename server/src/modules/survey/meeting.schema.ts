import gql from 'graphql-tag';

export const meetingTypeDefs = gql`
  enum MeetingStatus {
    REQUESTED
    SCHEDULED
    DONE
    CANCELLED
  }

  type OnboardingMeeting {
    id: ID!
    kind: SurveyKind!
    user_id: ID!
    user_name: String
    user_email: String
    requested_at: String!
    scheduled_at: String
    meeting_link: String
    status: MeetingStatus!
    notes: String
    contact_name: String
    contact_phone: String
    created_at: String
    updated_at: String
  }

  input RequestMeetingInput {
    requested_at: String!
    notes: String
    contact_name: String
    contact_phone: String
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

  extend type Query {
    "Current user's meeting request for a kind."
    myMeeting(kind: SurveyKind!): OnboardingMeeting
    "All of the current user's onboarding meetings (one per kind)."
    myMeetings: [OnboardingMeeting!]!
    "Onboarding list of meetings (calendar + tables)."
    onboardingMeetings(filter: MeetingFilter): [OnboardingMeeting!]!
    "Global slot-availability config."
    meetingAvailability: MeetingAvailability!
    "Bookable slots for the gate's meeting step (others' bookings disabled)."
    meetingSlots: [MeetingSlot!]!
  }

  extend type Mutation {
    requestMeeting(kind: SurveyKind!, input: RequestMeetingInput!): OnboardingMeeting!
    "Move the caller's own meeting to a new open slot (keeps contact details, resets staff scheduling)."
    rescheduleMyMeeting(kind: SurveyKind!, requested_at: String!): OnboardingMeeting!
    "Cancel the caller's own pending meeting."
    cancelMyMeeting(kind: SurveyKind!): OnboardingMeeting!
    updateMeeting(id: ID!, input: UpdateMeetingInput!): OnboardingMeeting!
    updateMeetingAvailability(input: MeetingAvailabilityInput!): MeetingAvailability!
  }
`;
