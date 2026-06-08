import { gql } from '@apollo/client';

export type LeadSurveyEntity = 'VENUE_LEAD' | 'HOST_LEAD';
export type LeadSurveySource = 'MANUAL' | 'LINK' | 'APP';
export type SurveyQuestionType = 'SECTION' | 'MCQ' | 'TEXT' | 'TEXTAREA';

export interface LeadSurveyQuestion {
  qid: string;
  type: SurveyQuestionType;
  label: string;
  help?: string | null;
  required: boolean;
  multi: boolean;
  options: string[];
}
export interface LeadSurveyDef {
  id: string;
  title: string;
  questions: LeadSurveyQuestion[];
}
export interface LeadSurveyAnswer {
  qid: string;
  value?: string | null;
  values: string[];
}
export interface LeadSurveyEntry {
  id: string;
  survey_id?: string | null;
  source: LeadSurveySource;
  token?: string | null;
  token_revoked: boolean;
  generated_by?: string | null;
  answers: LeadSurveyAnswer[];
  filled: boolean;
  submitted_at?: string | null;
  submitted_by?: string | null;
  created_at?: string | null;
}
export interface LeadSurveyResult {
  leadSurvey: { survey: LeadSurveyDef | null; entries: LeadSurveyEntry[] };
}

const ENTRY_FIELDS = `id survey_id source token token_revoked generated_by filled submitted_at submitted_by created_at answers { qid value values }`;

export const LEAD_SURVEY = gql`
  query LeadSurvey($entity: LeadSurveyEntity!, $lead_id: ID!) {
    leadSurvey(entity: $entity, lead_id: $lead_id) {
      survey { id title questions { qid type label help required multi options } }
      entries { ${ENTRY_FIELDS} }
    }
  }
`;

export const SAVE_LEAD_SURVEY_RESPONSE = gql`
  mutation SaveLeadSurveyResponse($entity: LeadSurveyEntity!, $lead_id: ID!, $survey_id: ID!, $answers: [SurveyAnswerInput!]!) {
    saveLeadSurveyResponse(entity: $entity, lead_id: $lead_id, survey_id: $survey_id, answers: $answers) { id }
  }
`;

export const GENERATE_LEAD_SURVEY_LINK = gql`
  mutation GenerateLeadSurveyLink($entity: LeadSurveyEntity!, $lead_id: ID!, $survey_id: ID!) {
    generateLeadSurveyLink(entity: $entity, lead_id: $lead_id, survey_id: $survey_id) { id token }
  }
`;

export const REVOKE_LEAD_SURVEY_LINK = gql`
  mutation RevokeLeadSurveyLink($entry_id: ID!) {
    revokeLeadSurveyLink(entry_id: $entry_id)
  }
`;

export const DELETE_LEAD_SURVEY_ENTRY = gql`
  mutation DeleteLeadSurveyEntry($entry_id: ID!) {
    deleteLeadSurveyEntry(entry_id: $entry_id)
  }
`;

/**
 * Public share link is hosted by CRM itself (e.g. https://crm.duncit.com/s/<token>),
 * open to anyone with the link — no login. Uses the current origin so it works
 * across environments without extra config.
 */
export const surveyLinkUrl = (token: string) => `${window.location.origin}/s/${token}`;
