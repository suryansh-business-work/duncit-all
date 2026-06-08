import gql from 'graphql-tag';

/**
 * CRM venue/host lead surveys. Reuses the onboarding `Survey` + `SurveyAnswer`
 * types from survey.schema.ts (registered in the same schema). Staff "generate"
 * the survey matching a lead's taxonomy and save the filled response on the lead.
 */
export const leadSurveyTypeDefs = gql`
  enum LeadSurveyEntity {
    VENUE_LEAD
    HOST_LEAD
  }

  type LeadSurveyResponse {
    survey_id: ID
    answers: [SurveyAnswer!]!
    submitted_at: String
    submitted_by: String
  }

  "The survey matched to a lead's taxonomy + any saved response."
  type LeadSurvey {
    survey: Survey
    response: LeadSurveyResponse
  }

  extend type Query {
    leadSurvey(entity: LeadSurveyEntity!, lead_id: ID!): LeadSurvey!
  }

  extend type Mutation {
    saveLeadSurveyResponse(
      entity: LeadSurveyEntity!
      lead_id: ID!
      survey_id: ID!
      answers: [SurveyAnswerInput!]!
    ): LeadSurveyResponse!
  }
`;
