export const interviewTypeDefs = /* GraphQL */ `
  enum InterviewType {
    HOST
    VENUE
  }

  enum InterviewStatus {
    PENDING
    SCHEDULED
    APPROVED
    REJECTED
    CANCELLED
  }

  type InterviewSlot {
    start: String!
    end: String!
  }

  type Interview {
    id: ID!
    type: InterviewType!
    applicant_user_id: ID!
    applicant_name: String!
    applicant_email: String!
    applicant_phone: String!
    about: String!
    business_name: String
    business_address: String
    city: String
    zone: String
    preferred_slots: [InterviewSlot!]!
    scheduled_slot: InterviewSlot
    status: InterviewStatus!
    meeting_link: String
    admin_notes: String
    created_at: String!
    updated_at: String!
  }

  input InterviewSlotInput {
    start: String!
    end: String!
  }

  input CreateInterviewInput {
    type: InterviewType!
    applicant_name: String!
    applicant_email: String!
    applicant_phone: String!
    about: String!
    business_name: String
    business_address: String
    city: String
    zone: String
    preferred_slots: [InterviewSlotInput!]!
  }

  input UpdateInterviewInput {
    status: InterviewStatus
    scheduled_slot: InterviewSlotInput
    meeting_link: String
    admin_notes: String
  }

  input InterviewFilterInput {
    status: InterviewStatus
    type: InterviewType
  }

  extend type Query {
    interviews(filter: InterviewFilterInput): [Interview!]!
    interview(interview_doc_id: ID!): Interview
    myInterviews: [Interview!]!
  }

  extend type Mutation {
    createInterview(input: CreateInterviewInput!): Interview!
    updateInterview(interview_doc_id: ID!, input: UpdateInterviewInput!): Interview!
    deleteInterview(interview_doc_id: ID!): Boolean!
  }
`;
