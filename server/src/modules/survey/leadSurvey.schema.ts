import gql from 'graphql-tag';

/**
 * CRM venue/host lead surveys. Reuses the onboarding `Survey` + `SurveyAnswer`
 * types from survey.schema.ts. Staff fill the survey manually or generate a
 * public share link; every generation/response is logged as a LeadSurveyEntry.
 * The `*ByToken` ops are public (no auth) for the mWeb /s/:token fill page.
 */
export const leadSurveyTypeDefs = gql`
  enum LeadSurveyEntity {
    VENUE_LEAD
    HOST_LEAD
  }
  enum LeadSurveySource {
    MANUAL
    LINK
    APP
  }

  type LeadSurveyEntry {
    id: ID!
    survey_id: ID
    source: LeadSurveySource!
    token: String
    token_revoked: Boolean!
    generated_by: String
    answers: [SurveyAnswer!]!
    filled: Boolean!
    submitted_at: String
    submitted_by: String
    created_at: String
  }

  type LeadSurveyCategoryRef {
    id: ID!
    name: String!
  }

  "The survey matched to a lead's taxonomy + the full generation/response log."
  type LeadSurvey {
    survey: Survey
    entries: [LeadSurveyEntry!]!
    "The lead's category / sub-category options — for the 'which one?' picker."
    categories: [LeadSurveyCategoryRef!]!
    sub_categories: [LeadSurveyCategoryRef!]!
  }

  "Public payload for the mWeb /s/:token fill page."
  type PublicLeadSurvey {
    survey: Survey
    lead_name: String!
    already_filled: Boolean!
  }

  "Server-side table page for the shared table engine (leadSurveyEntriesTable)."
  type LeadSurveyEntryTablePage {
    rows: [LeadSurveyEntry!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Optional category_id/sub_category_id resolve the survey for a chosen scope (multi-category leads)."
    leadSurvey(entity: LeadSurveyEntity!, lead_id: ID!, category_id: ID, sub_category_id: ID): LeadSurvey!
    "Server-side table page (filter/sort/paginate) over one lead's survey entries."
    leadSurveyEntriesTable(entity: LeadSurveyEntity!, lead_id: ID!, query: TableQueryInput): LeadSurveyEntryTablePage!
    "Public — resolve a survey from a share token (no auth)."
    leadSurveyByToken(token: String!): PublicLeadSurvey!
  }

  extend type Mutation {
    saveLeadSurveyResponse(entity: LeadSurveyEntity!, lead_id: ID!, survey_id: ID!, answers: [SurveyAnswerInput!]!): LeadSurveyEntry!
    generateLeadSurveyLink(entity: LeadSurveyEntity!, lead_id: ID!, survey_id: ID!): LeadSurveyEntry!
    revokeLeadSurveyLink(entry_id: ID!): Boolean!
    deleteLeadSurveyEntry(entry_id: ID!): Boolean!
    "Public — submit answers via a share token (no auth)."
    submitLeadSurveyByToken(token: String!, answers: [SurveyAnswerInput!]!): Boolean!
  }
`;
