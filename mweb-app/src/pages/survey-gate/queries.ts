import { gql } from '@apollo/client';

export type SurveyKind = 'VENUE' | 'HOST';
export type SurveyQuestionType = 'SECTION' | 'MCQ' | 'TEXT' | 'TEXTAREA';

export interface SurveyQuestion {
  qid: string;
  type: SurveyQuestionType;
  label: string;
  help?: string | null;
  required: boolean;
  multi: boolean;
  options: string[];
}
export interface ActiveSurvey {
  kind: SurveyKind;
  title: string;
  questions: SurveyQuestion[];
}

export const ACTIVE_SURVEY = gql`
  query ActiveSurvey($kind: SurveyKind!) {
    activeSurvey(kind: $kind) {
      kind
      title
      questions { qid type label help required multi options }
    }
  }
`;

export const MY_SURVEY_RESPONSE = gql`
  query MySurveyResponse($kind: SurveyKind!) {
    mySurveyResponse(kind: $kind) { kind submitted_at }
  }
`;

export const SUBMIT_SURVEY_RESPONSE = gql`
  mutation SubmitSurveyResponse($kind: SurveyKind!, $answers: [SurveyAnswerInput!]!) {
    submitSurveyResponse(kind: $kind, answers: $answers) { kind submitted_at }
  }
`;

export const MY_MEETING = gql`
  query MyMeeting($kind: SurveyKind!) {
    myMeeting(kind: $kind) { id }
  }
`;

export const REQUEST_MEETING = gql`
  mutation RequestMeeting($kind: SurveyKind!, $input: RequestMeetingInput!) {
    requestMeeting(kind: $kind, input: $input) { id }
  }
`;

/** Internal route to continue to after the gate (PartnerRedirect handles the external jump). */
export const PARTNER_PATH: Record<SurveyKind, string> = {
  VENUE: '/register-venue',
  HOST: '/become-host',
};
