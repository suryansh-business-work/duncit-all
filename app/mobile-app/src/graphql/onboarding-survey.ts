import { parse } from 'graphql';

/**
 * Venue/Host onboarding survey shown before "Be a host" / "Register a venue".
 * The user first picks Super → Category → Sub; the matching survey (most
 * specific) is then resolved via `activeSurveyFor`. Uses raw DocumentNodes
 * (server schema, no codegen) via graphqlRequest. Distinct from the
 * signup-interest survey in `survey.ts`.
 */
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
export type MeetingApprovalStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'DENIED';
export interface MyMeeting {
  id: string;
  /** Human-readable request id (DUN-VEN-/DUN-HOST-/DUN-BRAND-000001). */
  request_no?: string | null;
  status: MeetingStatus;
  /** Admin-approval state of the post-meeting feedback. A DONE meeting still at
   * NONE/PENDING means onboarding is in process (not yet completed). */
  approval_status?: MeetingApprovalStatus | null;
  requested_at: string;
  scheduled_at?: string | null;
  meeting_link?: string | null;
  /** Times the user has rescheduled — reschedule is one-time (0 = not yet used). */
  reschedule_count?: number | null;
}
export interface MyMeetingResult {
  myMeeting: MyMeeting | null;
}
export interface RequestMeetingInput {
  requested_at: string;
  notes?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  /** Taxonomy the applicant chose in the gate — shown on the onboarding listing. */
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
}
export interface MeetingSlot {
  start_at: string;
  end_at: string;
  available: boolean;
}
export interface MeetingSlotsResult {
  meetingSlots: MeetingSlot[];
}
export interface MyMeetingsResult {
  myMeetings: (MyMeeting & {
    kind: string;
    /** Linked onboarded record status (DRAFT|SUBMITTED|APPROVED|REJECTED) once a
     * Host/Venue/Seller meeting is approved; null for Club Admin / not yet drafted.
     * Keeps the Earn card locked while the record is under review (Item 2). */
    onboarded_status?: string | null;
  })[];
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
      request_no
      status
      requested_at
      scheduled_at
      meeting_link
      reschedule_count
    }
  }
`);

export const RequestMeetingDocument = parse(`
  mutation RequestMeeting($kind: SurveyKind!, $input: RequestMeetingInput!) {
    requestMeeting(kind: $kind, input: $input) { id request_no }
  }
`);

export const MeetingSlotsDocument = parse(`
  query MeetingSlots($kind: SurveyKind) {
    meetingSlots(kind: $kind) {
      start_at
      end_at
      available
    }
  }
`);

export const RescheduleMyMeetingDocument = parse(`
  mutation RescheduleMyMeeting($kind: SurveyKind!, $requested_at: String!, $reason: String) {
    rescheduleMyMeeting(kind: $kind, requested_at: $requested_at, reason: $reason) {
      id
      requested_at
      status
      reschedule_count
    }
  }
`);

export const CancelMyMeetingDocument = parse(`
  mutation CancelMyMeeting($kind: SurveyKind!, $reason: String) {
    cancelMyMeeting(kind: $kind, reason: $reason) { id status }
  }
`);

export const MyMeetingsDocument = parse(`
  query MyMeetings {
    myMeetings {
      id
      request_no
      kind
      status
      approval_status
      onboarded_status
      requested_at
      scheduled_at
      reschedule_count
    }
  }
`);
