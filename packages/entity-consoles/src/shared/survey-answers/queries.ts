import { gql } from '@apollo/client';

export type SurveyKind = 'VENUE' | 'HOST' | 'ECOMM' | 'CLUB_ADMIN';

export interface UserSurveyResponse {
  kind: SurveyKind;
  title: string;
  items: { label: string; answer: string }[];
}

/** What an applicant answered in the Earn with Duncit gate, per kind. Read by
 * the meeting drawer, the meeting decision dialog and the host review dialog. */
export const USER_SURVEY_RESPONSES = gql`
  query MeetingUserSurveyResponses($user_id: ID!) {
    userSurveyResponses(user_id: $user_id) {
      kind
      title
      items {
        label
        answer
      }
    }
  }
`;
