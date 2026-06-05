import gql from 'graphql-tag';

export const surveyTypeDefs = gql`
  enum SurveyKind {
    VENUE
    HOST
  }
  enum SurveyQuestionType {
    SECTION
    MCQ
    TEXT
    TEXTAREA
  }

  type SurveyQuestion {
    qid: ID!
    type: SurveyQuestionType!
    label: String!
    help: String
    required: Boolean!
    multi: Boolean!
    options: [String!]!
    sort_order: Int!
  }

  type Survey {
    kind: SurveyKind!
    title: String!
    is_active: Boolean!
    questions: [SurveyQuestion!]!
    updated_at: String
  }

  input SurveyQuestionInput {
    qid: ID
    type: SurveyQuestionType!
    label: String!
    help: String
    required: Boolean
    multi: Boolean
    options: [String!]
  }
  input UpsertSurveyInput {
    title: String
    is_active: Boolean
    questions: [SurveyQuestionInput!]!
  }

  type SurveyAnswer {
    qid: ID!
    value: String
    values: [String!]!
  }
  input SurveyAnswerInput {
    qid: ID!
    value: String
    values: [String!]
  }
  type SurveyResponse {
    kind: SurveyKind!
    answers: [SurveyAnswer!]!
    submitted_at: String
  }

  "A user's response joined with the survey's question labels (for admin display)."
  type SurveyResponseItem {
    qid: ID!
    label: String!
    type: SurveyQuestionType!
    answer: String!
  }
  type UserSurveyResponse {
    kind: SurveyKind!
    submitted_at: String
    items: [SurveyResponseItem!]!
  }

  extend type Query {
    "Builder read of the survey for a kind (may be empty)."
    survey(kind: SurveyKind!): Survey
    "Active survey for gating registration — null when none/empty."
    activeSurvey(kind: SurveyKind!): Survey
    "Current user's submitted response for a kind (drives 'required once')."
    mySurveyResponse(kind: SurveyKind!): SurveyResponse
    "All survey responses for a user (admin)."
    userSurveyResponses(user_id: ID!): [UserSurveyResponse!]!
  }

  extend type Mutation {
    upsertSurvey(kind: SurveyKind!, input: UpsertSurveyInput!): Survey!
    submitSurveyResponse(kind: SurveyKind!, answers: [SurveyAnswerInput!]!): SurveyResponse!
  }
`;
