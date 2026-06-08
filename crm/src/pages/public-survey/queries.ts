import { gql } from '@apollo/client';
import type { LeadSurveyDef } from '../../components/lead-survey/queries';

export interface PublicLeadSurvey {
  survey: LeadSurveyDef | null;
  lead_name: string;
  already_filled: boolean;
}

export const LEAD_SURVEY_BY_TOKEN = gql`
  query LeadSurveyByToken($token: String!) {
    leadSurveyByToken(token: $token) {
      survey { id title questions { qid type label help required multi options } }
      lead_name
      already_filled
    }
  }
`;

export const SUBMIT_LEAD_SURVEY_BY_TOKEN = gql`
  mutation SubmitLeadSurveyByToken($token: String!, $answers: [SurveyAnswerInput!]!) {
    submitLeadSurveyByToken(token: $token, answers: $answers)
  }
`;

/** Public branding (logo, name) — surfaced at the top of the survey. */
export const PUBLIC_BRANDING = gql`
  query PublicSurveyBranding {
    branding {
      app_name
      logo_url
    }
  }
`;
export interface PublicBranding {
  branding: { app_name: string; logo_url: string } | null;
}
