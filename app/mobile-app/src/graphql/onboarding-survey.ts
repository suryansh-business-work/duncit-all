import { parse } from 'graphql';

/**
 * Venue/Host onboarding survey shown before "Be a host" / "Register a venue".
 * The user first picks Super → Category → Sub; the matching survey (most
 * specific) is then resolved via `activeSurveyFor`. Uses raw DocumentNodes
 * (server schema, no codegen) via graphqlRequest. Distinct from the
 * signup-interest survey in `survey.ts`.
 */
export type SurveyKind = 'VENUE' | 'HOST' | 'ECOMM';
export type SurveyQuestionType = 'SECTION' | 'MCQ' | 'TEXT' | 'TEXTAREA';
export type CategoryLevel = 'SUPER' | 'CATEGORY' | 'SUB';

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
  id: string;
  kind: SurveyKind;
  title: string;
  questions: SurveyQuestion[];
}
export interface CategoryOption {
  id: string;
  name: string;
  level: CategoryLevel;
  parent_id?: string | null;
  is_active?: boolean;
  sort_order?: number;
}
export interface CategoriesResult {
  categories: CategoryOption[];
}
export interface ActiveSurveyResult {
  activeSurveyFor: ActiveSurvey | null;
}
export interface MyResponseResult {
  mySurveyResponse: { survey_id: string } | null;
}
export type MeetingStatus = 'REQUESTED' | 'SCHEDULED' | 'DONE' | 'CANCELLED';
export interface MyMeeting {
  id: string;
  status: MeetingStatus;
  requested_at: string;
  scheduled_at?: string | null;
  meeting_link?: string | null;
}
export interface MyMeetingResult {
  myMeeting: MyMeeting | null;
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

export const CategoriesDocument = parse(`
  query SurveyOnboardingCategories($level: CategoryLevel!, $parent_id: ID) {
    categories(filter: { level: $level, parent_id: $parent_id }) {
      id name level parent_id is_active sort_order
    }
  }
`);

export const ActiveSurveyForDocument = parse(`
  query ActiveSurveyFor($kind: SurveyKind!, $super_category_id: ID, $category_id: ID, $sub_category_id: ID) {
    activeSurveyFor(kind: $kind, super_category_id: $super_category_id, category_id: $category_id, sub_category_id: $sub_category_id) {
      id
      kind
      title
      questions { qid type label help required multi options }
    }
  }
`);

export const MySurveyResponseDocument = parse(`
  query MySurveyResponse($survey_id: ID!) {
    mySurveyResponse(survey_id: $survey_id) { survey_id }
  }
`);

export const SubmitSurveyResponseDocument = parse(`
  mutation SubmitSurveyResponse($survey_id: ID!, $answers: [SurveyAnswerInput!]!) {
    submitSurveyResponse(survey_id: $survey_id, answers: $answers) { survey_id }
  }
`);

export const MyMeetingDocument = parse(`
  query MyMeeting($kind: SurveyKind!) {
    myMeeting(kind: $kind) {
      id
      status
      requested_at
      scheduled_at
      meeting_link
    }
  }
`);

export const RequestMeetingDocument = parse(`
  mutation RequestMeeting($kind: SurveyKind!, $input: RequestMeetingInput!) {
    requestMeeting(kind: $kind, input: $input) { id }
  }
`);
