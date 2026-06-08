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

  "The survey matched to a lead's taxonomy + the full generation/response log."
  type LeadSurvey {
    survey: Survey
    entries: [LeadSurveyEntry!]!
  }

  "Public payload for the mWeb /s/:token fill page."
  type PublicLeadSurvey {
    survey: Survey
    lead_name: String!
    already_filled: Boolean!
  }

  extend type Query {
    leadSurvey(entity: LeadSurveyEntity!, lead_id: ID!): LeadSurvey!
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
