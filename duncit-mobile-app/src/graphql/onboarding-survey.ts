import { parse } from 'graphql';

/**
 * Venue/Host onboarding survey shown before "Be a host" / "Register a venue".
 * Uses raw DocumentNodes (server schema, no codegen needed) via graphqlRequest.
 * Distinct from the signup-interest survey in `survey.ts`.
 */
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
export interface ActiveSurveyResult {
  activeSurvey: { kind: SurveyKind; title: string; questions: SurveyQuestion[] } | null;
}
export interface MyResponseResult {
  mySurveyResponse: { kind: SurveyKind } | null;
}
export interface SubmitResult {
  submitSurveyResponse: { kind: SurveyKind } | null;
}
export interface MyMeetingResult {
  myMeeting: { id: string } | null;
}
export interface RequestMeetingInput {
  requested_at: string;
  notes?: string | null;
}
export interface SurveyAnswerInput {
  qid: string;
  value?: string | null;
  values?: string[];
}

export const ActiveSurveyDocument = parse(`
  query ActiveSurvey($kind: SurveyKind!) {
    activeSurvey(kind: $kind) {
      kind
      title
      questions { qid type label help required multi options }
    }
  }
`);

export const MySurveyResponseDocument = parse(`
  query MySurveyResponse($kind: SurveyKind!) {
    mySurveyResponse(kind: $kind) { kind }
  }
`);

export const SubmitSurveyResponseDocument = parse(`
  mutation SubmitSurveyResponse($kind: SurveyKind!, $answers: [SurveyAnswerInput!]!) {
    submitSurveyResponse(kind: $kind, answers: $answers) { kind }
  }
`);

export const MyMeetingDocument = parse(`
  query MyMeeting($kind: SurveyKind!) {
    myMeeting(kind: $kind) { id }
  }
`);

export const RequestMeetingDocument = parse(`
  mutation RequestMeeting($kind: SurveyKind!, $input: RequestMeetingInput!) {
    requestMeeting(kind: $kind, input: $input) { id }
  }
`);
