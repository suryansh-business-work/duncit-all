import { gql } from '@apollo/client';

export type SurveyKind = 'VENUE' | 'HOST';
export type MeetingStatus = 'REQUESTED' | 'SCHEDULED' | 'DONE' | 'CANCELLED';

export interface OnboardingMeeting {
  id: string;
  kind: SurveyKind;
  user_name?: string | null;
  user_email?: string | null;
  requested_at: string;
  scheduled_at?: string | null;
  meeting_link?: string | null;
  status: MeetingStatus;
  notes?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
}

const FIELDS = `
  id kind user_name user_email requested_at scheduled_at meeting_link status notes contact_name contact_phone
`;

export const ONBOARDING_MEETINGS = gql`
  query OnboardingMeetings($filter: MeetingFilter) {
    onboardingMeetings(filter: $filter) { ${FIELDS} }
  }
`;

export const UPDATE_MEETING = gql`
  mutation UpdateMeeting($id: ID!, $input: UpdateMeetingInput!) {
    updateMeeting(id: $id, input: $input) { ${FIELDS} }
  }
`;
