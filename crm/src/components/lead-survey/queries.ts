import { gql } from '@apollo/client';

export type LeadSurveyEntity = 'VENUE_LEAD' | 'HOST_LEAD';
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
export interface LeadSurveyResponse {
  survey_id?: string | null;
  answers: LeadSurveyAnswer[];
  submitted_at?: string | null;
  submitted_by?: string | null;
}
export interface LeadSurveyResult {
  leadSurvey: { survey: LeadSurveyDef | null; response: LeadSurveyResponse | null };
}

export const LEAD_SURVEY = gql`
  query LeadSurvey($entity: LeadSurveyEntity!, $lead_id: ID!) {
    leadSurvey(entity: $entity, lead_id: $lead_id) {
      survey { id title questions { qid type label help required multi options } }
      response { survey_id answers { qid value values } submitted_at submitted_by }
    }
  }
`;

export const SAVE_LEAD_SURVEY_RESPONSE = gql`
  mutation SaveLeadSurveyResponse($entity: LeadSurveyEntity!, $lead_id: ID!, $survey_id: ID!, $answers: [SurveyAnswerInput!]!) {
    saveLeadSurveyResponse(entity: $entity, lead_id: $lead_id, survey_id: $survey_id, answers: $answers) {
      survey_id
      submitted_at
      submitted_by
    }
  }
`;
