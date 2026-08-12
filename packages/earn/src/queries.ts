import { gql } from '@apollo/client';

/** Roles + onboarding meetings — everything the journey list needs to decide
 * which cards are locked, pending or approved. */
export const EARN_ME = gql`
  query EarnMe {
    me {
      user_id
      roles
    }
    myMeetings {
      id
      request_no
      kind
      status
      approval_status
      onboarded_status
      scheduled_at
      requested_at
      reschedule_count
    }
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

export const RESCHEDULE_MY_MEETING = gql`
  mutation RescheduleMyMeeting($kind: SurveyKind!, $requested_at: String!, $reason: String) {
    rescheduleMyMeeting(kind: $kind, requested_at: $requested_at, reason: $reason) {
      id
      requested_at
      status
      reschedule_count
    }
  }
`;

export const CANCEL_MY_MEETING = gql`
  mutation CancelMyMeeting($kind: SurveyKind!, $reason: String) {
    cancelMyMeeting(kind: $kind, reason: $reason) {
      id
      status
    }
  }
`;

export const PUBLIC_FEATURE_FLAGS = gql`
  query PublicFeatureFlags {
    publicFeatureFlags {
      key
      enabled
    }
  }
`;

export interface MeetingSlot {
  start_at: string;
  end_at: string;
  available: boolean;
}
