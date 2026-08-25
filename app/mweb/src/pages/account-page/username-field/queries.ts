import { gql } from '@apollo/client';

/** Codes, not sentences — the field owns the copy (rule 38). */
export interface UsernameAvailability {
  username: string;
  available: boolean;
  reason: 'FORMAT' | 'RESERVED' | 'TAKEN' | null;
}

/**
 * Fired from a debounced field, so the selection is deliberately thin: a
 * keystroke must not drag the whole user record with it.
 */
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
