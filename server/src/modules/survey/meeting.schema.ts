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

  extend type Query {
    "Current user's meeting request for a kind."
    myMeeting(kind: SurveyKind!): OnboardingMeeting
    "Onboarding list of meetings (calendar + tables)."
    onboardingMeetings(filter: MeetingFilter): [OnboardingMeeting!]!
  }

  extend type Mutation {
    requestMeeting(kind: SurveyKind!, input: RequestMeetingInput!): OnboardingMeeting!
    updateMeeting(id: ID!, input: UpdateMeetingInput!): OnboardingMeeting!
  }
`;
