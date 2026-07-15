import { gql } from '@apollo/client';

export type SurveyKind = 'VENUE' | 'HOST' | 'ECOMM' | 'CLUB_ADMIN';
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

export const CATEGORIES = gql`
  query SurveyGateCategories($level: CategoryLevel!, $parent_id: ID) {
    categories(filter: { level: $level, parent_id: $parent_id }) {
      id name level parent_id is_active sort_order
    }
  }
`;

export const ACTIVE_SURVEY_FOR = gql`
  query ActiveSurveyFor($kind: SurveyKind!, $super_category_id: ID, $category_id: ID, $sub_category_id: ID) {
    activeSurveyFor(kind: $kind, super_category_id: $super_category_id, category_id: $category_id, sub_category_id: $sub_category_id) {
      id
      kind
      title
      questions { qid type label help required multi options }
    }
  }
`;

export const MY_SURVEY_RESPONSE = gql`
  query MySurveyResponse($survey_id: ID!) {
    mySurveyResponse(survey_id: $survey_id) { survey_id submitted_at }
  }
`;

export const SUBMIT_SURVEY_RESPONSE = gql`
  mutation SubmitSurveyResponse($survey_id: ID!, $answers: [SurveyAnswerInput!]!) {
    submitSurveyResponse(survey_id: $survey_id, answers: $answers) { survey_id submitted_at }
  }
`;

export const MY_MEETING = gql`
  query MyMeeting($kind: SurveyKind!) {
    myMeeting(kind: $kind) {
      id
      request_no
      status
      requested_at
      scheduled_at
      meeting_link
      reschedule_count
    }
  }
`;

export const REQUEST_MEETING = gql`
  mutation RequestMeeting($kind: SurveyKind!, $input: RequestMeetingInput!) {
    requestMeeting(kind: $kind, input: $input) { id }
  }
`;

export const MEETING_SLOTS = gql`
  query MeetingSlots($kind: SurveyKind) {
    meetingSlots(kind: $kind) {
      start_at
      end_at
      available
    }
  }
`;

export interface MeetingSlot {
  start_at: string;
  end_at: string;
  available: boolean;
}

/** Internal route to continue to after the gate (PartnerRedirect handles the external jump). */
export const PARTNER_PATH: Record<SurveyKind, string> = {
  VENUE: '/register-venue',
  HOST: '/become-host',
  ECOMM: '/products/manage',
  CLUB_ADMIN: '/club-admin',
};
