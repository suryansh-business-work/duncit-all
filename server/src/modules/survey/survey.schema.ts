import gql from 'graphql-tag';

export const surveyTypeDefs = gql`
  enum SurveyKind {
    VENUE
    HOST
    ECOMM
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
    id: ID!
    kind: SurveyKind!
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    super_category_name: String
    category_name: String
    sub_category_name: String
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
  input CreateSurveyInput {
    kind: SurveyKind!
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    title: String
    is_active: Boolean
    questions: [SurveyQuestionInput!]!
  }
  input UpdateSurveyInput {
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
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
    survey_id: ID
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
    title: String
    submitted_at: String
    items: [SurveyResponseItem!]!
  }

  extend type Query {
    "Onboarding list — surveys for a kind, optionally narrowed by taxonomy/search."
    surveys(kind: SurveyKind, super_category_id: ID, category_id: ID, sub_category_id: ID, search: String): [Survey!]!
    "Builder read of a single survey by id."
    surveyById(id: ID!): Survey
    "Kind-level default survey (all scope null) — back-compat."
    activeSurvey(kind: SurveyKind!): Survey
    "Most-specific active survey for a chosen taxonomy slot — null when none."
    activeSurveyFor(kind: SurveyKind!, super_category_id: ID, category_id: ID, sub_category_id: ID): Survey
    "Current user's submitted response for a survey (drives 'asked once')."
    mySurveyResponse(survey_id: ID!): SurveyResponse
    "All survey responses for a user (admin)."
    userSurveyResponses(user_id: ID!): [UserSurveyResponse!]!
  }

  extend type Mutation {
    createSurvey(input: CreateSurveyInput!): Survey!
    updateSurvey(id: ID!, input: UpdateSurveyInput!): Survey!
    deleteSurvey(id: ID!): Boolean!
    submitSurveyResponse(survey_id: ID!, answers: [SurveyAnswerInput!]!): SurveyResponse!
  }
`;
