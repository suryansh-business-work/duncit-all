import { gql } from '@apollo/client';

export type SurveyKind = 'VENUE' | 'HOST' | 'ECOMM';
export type MeetingStatus = 'REQUESTED' | 'SCHEDULED' | 'DONE' | 'CANCELLED';
export type MeetingApprovalStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'DENIED';

export interface OnboardingMeeting {
  id: string;
  kind: SurveyKind;
  user_name?: string | null;
  user_email?: string | null;
  user_id?: string | null;
  requested_at: string;
  scheduled_at?: string | null;
  meeting_link?: string | null;
  status: MeetingStatus;
  cancel_reason?: string | null;
  dismissed?: boolean | null;
  notes?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  approval_status?: MeetingApprovalStatus | null;
  feedback?: string | null;
  super_category_name?: string | null;
  category_name?: string | null;
  sub_category_name?: string | null;
  reschedule_count?: number | null;
}

export interface SurveyResponseItem {
  label: string;
  answer: string;
}

export interface UserSurveyResponse {
  kind: SurveyKind;
  title?: string | null;
  items: SurveyResponseItem[];
}

export interface MeetingSlot {
  start_at: string;
  end_at: string;
  available: boolean;
}

export interface MeetingAvailability {
  week_days: number[];
  start_time: string;
  end_time: string;
  slot_minutes: number;
  timezone_offset_minutes: number;
}

export type HolidayType = 'PUBLIC_HOLIDAY' | 'OFFICE_HOLIDAY' | 'OFFICIAL_LEAVE';

export interface MeetingHoliday {
  id: string;
  date: string; // YYYY-MM-DD (wall-clock IST day)
  name?: string | null;
  type: HolidayType;
}

export const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  PUBLIC_HOLIDAY: 'Public Holiday',
  OFFICE_HOLIDAY: 'Office Holiday',
  OFFICIAL_LEAVE: 'Official Leave',
};

const FIELDS = `
  id kind user_id user_name user_email requested_at scheduled_at meeting_link status cancel_reason dismissed notes contact_name contact_phone approval_status feedback
  super_category_name category_name sub_category_name reschedule_count
`;

export const ONBOARDING_MEETINGS = gql`
  query OnboardingMeetings($filter: MeetingFilter) {
    onboardingMeetings(filter: $filter) { ${FIELDS} }
  }
`;

export const MEETING_AVAILABILITY = gql`
  query CalendarMeetingAvailability {
    meetingAvailability {
      week_days
      start_time
      end_time
      slot_minutes
      timezone_offset_minutes
    }
  }
`;

export const MEETING_SLOTS = gql`
  query StaffMeetingSlots($exclude_meeting_id: ID) {
    meetingSlots(exclude_meeting_id: $exclude_meeting_id) {
      start_at
      end_at
      available
    }
  }
`;

export const UPDATE_MEETING = gql`
  mutation UpdateMeeting($id: ID!, $input: UpdateMeetingInput!) {
    updateMeeting(id: $id, input: $input) { ${FIELDS} }
  }
`;

export const CANCEL_MEETING = gql`
  mutation CancelMeeting($id: ID!, $reason: String!) {
    cancelMeeting(id: $id, reason: $reason) { ${FIELDS} }
  }
`;

export const DISMISS_MEETING = gql`
  mutation DismissMeeting($id: ID!) {
    dismissMeeting(id: $id) { ${FIELDS} }
  }
`;

export const SEND_MEETING_FEEDBACK = gql`
  mutation SendMeetingFeedback($id: ID!, $feedback: String!) {
    sendMeetingFeedback(id: $id, feedback: $feedback) { ${FIELDS} }
  }
`;

export const USER_SURVEY_RESPONSES = gql`
  query MeetingUserSurveyResponses($user_id: ID!) {
    userSurveyResponses(user_id: $user_id) {
      kind
      title
      items { label answer }
    }
  }
`;

export const MEETING_HOLIDAYS = gql`
  query MeetingHolidays {
    meetingHolidays { id date name type }
  }
`;

export const ADD_MEETING_HOLIDAY = gql`
  mutation AddMeetingHoliday($input: AddMeetingHolidayInput!) {
    addMeetingHoliday(input: $input) { id date name type }
  }
`;

export const REMOVE_MEETING_HOLIDAY = gql`
  mutation RemoveMeetingHoliday($id: ID!) {
    removeMeetingHoliday(id: $id)
  }
`;
