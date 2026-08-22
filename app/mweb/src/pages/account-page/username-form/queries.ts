import { gql } from '@apollo/client';

export interface UsernameAvailability {
  username: string;
  available: boolean;
  reason: 'FORMAT' | 'RESERVED' | 'TAKEN' | null;
}

export const USERNAME_AVAILABILITY = gql`
  query UsernameAvailability($username: String!) {
    usernameAvailability(username: $username) {
      username
      available
      reason
    }
  }
`;

export const SET_MY_USERNAME = gql`
  mutation SetMyUsername($username: String!) {
    setMyUsername(username: $username) {
      user_id
      username
    }
  }
`;
